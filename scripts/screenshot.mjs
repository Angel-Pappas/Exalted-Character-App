// Screenshot app pages from the DEV checkout (dev database + the `demo` login from
// DemoSeeder, never live), so a change can be looked at before it ships. Usage:
//
//   npm run shots -- / /characters "/character/<id>"   [--mobile] [--light] [--wide] [--full] [--click=Milestones] [--fill=Search=Ox]
//
// (the `--` matters: without it npm swallows the --flags itself)
//
// --wide is Angel's desktop (2560 wide) and captures the whole page, not just the
// first screenful — the sheet's layout is sized for that width. --full captures the
// whole page at any size. --light switches the app to its light theme (Settings →
// Appearance); without it the app is in its default dark theme.
//
// Serves the built front end (`dist/`, SPA fallback to index.html) and forwards
// `/api/*` to `php artisan serve` (backend/), the same split nginx does live. Logs
// in as demo (session cached in backend/storage/screenshots/.auth.json) and writes
// one PNG per path to backend/storage/screenshots/. Needs `npm run build` first.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const API_PORT = 8127;
const WEB_PORT = 8128;
const BASE = `http://127.0.0.1:${WEB_PORT}`;
const OUT = 'backend/storage/screenshots';
const AUTH = `${OUT}/.auth.json`;
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
};

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const light = args.includes('--light');
const full = args.includes('--full');
const wide = args.includes('--wide');
// Steps run on each page before the shot, in the order given:
//   --click=Text           clicks the button, link or checkbox with that text, or else any element
//                          showing exactly that text (e.g. --click=Milestones, --click="Ox Body Technique")
//   --fill=Placeholder=Val types Val into the field with that placeholder
const steps = args
    .filter((a) => a.startsWith('--click=') || a.startsWith('--fill='))
    .map((a) => {
        const [flag, ...rest] = a.slice(2).split('=');
        return flag === 'click'
            ? { click: rest.join('=') }
            : { fill: rest[0], value: rest.slice(1).join('=') };
    });
const paths = args.filter((a) => !a.startsWith('--'));
if (paths.length === 0) paths.push('/');

mkdirSync(OUT, { recursive: true });

async function apiUp() {
    try {
        return (await fetch(`http://127.0.0.1:${API_PORT}/api/me`)).status < 500;
    } catch {
        return false;
    }
}

let api = null;
if (!(await apiUp())) {
    api = spawn('php', ['artisan', 'serve', `--port=${API_PORT}`], {
        cwd: 'backend',
        stdio: 'ignore',
    });
    for (let i = 0; i < 50 && !(await apiUp()); i++) {
        await new Promise((r) => setTimeout(r, 200));
    }
}

const web = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
        const upstream = http.request(
            {
                host: '127.0.0.1',
                port: API_PORT,
                method: req.method,
                path: req.url,
                headers: req.headers,
            },
            (up) => {
                res.writeHead(up.statusCode ?? 502, up.headers);
                up.pipe(res);
            },
        );
        upstream.on('error', () => res.writeHead(502).end());
        req.pipe(upstream);
        return;
    }
    const path = normalize(decodeURIComponent(req.url.split('?')[0]));
    let file = join('dist', path);
    if (!existsSync(file) || statSync(file).isDirectory()) {
        file = join('dist', 'index.html');
    }
    res.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    res.end(readFileSync(file));
});
await new Promise((r) => web.listen(WEB_PORT, '127.0.0.1', r));

const browser = await chromium.launch();
try {
    const context = await browser.newContext({
        viewport: mobile
            ? { width: 390, height: 844 }
            : wide
              ? { width: 2560, height: 1440 }
              : { width: 1440, height: 900 },
        colorScheme: light ? 'light' : 'dark',
        storageState: existsSync(AUTH) ? AUTH : undefined,
    });
    // The app keeps the chosen theme in localStorage (ThemeContext).
    await context.addInitScript((theme) => localStorage.setItem('theme', theme), light ? 'light' : 'dark');
    const page = await context.newPage();

    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    if (new URL(page.url()).pathname.startsWith('/login')) {
        await page.fill('input[placeholder="your_username"]', 'demo');
        await page.fill('input[type="password"]', 'password');
        await page.click('button[type="submit"]');
        await page.waitForURL((u) => !u.pathname.startsWith('/login'));
        await context.storageState({ path: AUTH });
    }

    for (const path of paths) {
        await page.goto(`${BASE}${path}`);
        await page.waitForLoadState('networkidle');
        for (const step of steps) {
            if (step.click) {
                await page.getByRole('button', { name: step.click, exact: true })
                    .or(page.getByRole('link', { name: step.click, exact: true }))
                    .or(page.getByLabel(step.click, { exact: true }))
                    .or(page.getByText(step.click, { exact: true })).first().click();
            } else {
                await page.getByPlaceholder(step.fill).first().fill(step.value);
            }
            await page.waitForLoadState('networkidle');
        }
        const slug =
            path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
        const clicked = steps
            .map((st) => `-${(st.click ?? st.value).replace(/[^a-z0-9]+/gi, '-')}`)
            .join('');
        const file = `${OUT}/${slug}${clicked}${mobile ? '-mobile' : ''}${wide ? '-wide' : ''}${light ? '-light' : ''}.png`;
        await page.screenshot({ path: file, fullPage: wide || full });
        console.log(file);
    }
} finally {
    await browser.close();
    web.close();
    api?.kill();
}
