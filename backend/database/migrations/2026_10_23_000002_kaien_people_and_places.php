<?php

use App\Models\Character;
use App\Models\WikiPage;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Angel, 2026-10-23: the first pages of Kaien's People & Places.
 *  - Places: Dovestone, Greyfalls, Port Calin.
 *  - Kaien himself, and the group Kaien's Entourage: the eighteen people of the
 *    Service Estate, each with Angel's write-up. Six stayed in Dovestone; the rest
 *    are in Greyfalls.
 *  - In Greyfalls: Blaque, Ral, Maelia, Avaros, Ilyatha, Seset. In Dovestone:
 *    Solaen, Marek, Jorel.
 * In each write-up the first mention of another page becomes a link; Veyra has no
 * page yet, so hers is a red link that starts one.
 *
 * Adds only. A page whose name is already in the wiki is left exactly as it is
 * (only linked to), so running this again changes nothing.
 */
return new class extends Migration
{
    private const KAIEN = '7b910733-97f8-418c-bac1-cbaa1e0cb39e';

    private const ENTOURAGE = "Kaien's Entourage";

    /** Who stayed in Dovestone; the rest of the entourage is in Greyfalls. */
    private const STAYED_IN_DOVESTONE = ['Damos Red-Hand', 'Iria Ten-Marks', 'Ravela Stonecot', 'Cato Meren', 'Thessa Meren', 'Garin Vos'];

    /** Angel's write-up of each member: name => [role, age, description, use]. */
    private const MEMBERS = [
        'Oren Varkas' => ['Veteran armsman / informal captain', 'Late 50s',
            'A grey-bearded former estate guard who served Kaien’s father and remembers Kaien as a child. Stern, practical, and deeply moved by Kaien’s return, though he hides it behind discipline.',
            'The one who says, “My lord, with respect…” when Kaien is about to do something reckless.'],
        'Mina Varkas' => ['Quartermaster / Oren’s daughter', 'Early 30s',
            'Sharp-eyed, exacting, and impossible to cheat. Handles food stores, arrows, armor straps, horse feed, and camp order.',
            'Keeps the company functioning; quietly notices who is stealing, lying, or hiding injuries.'],
        'Talan Brost' => ['Shieldman', 'Early 40s',
            'Large, quiet, and scarred. Not brilliant, but unshakably brave. Was one of the few who kept estate guards together during the family’s fall.',
            'Loyal bodyguard; speaks rarely, but when he does, people listen.'],
        'Sera Kallin' => ['Spearwoman / patrol lead', 'Late 20s',
            'Fast, disciplined, and proud of being trusted with forward patrols. She idolizes Kaien a little too much and sees him as the restoration of everything lost.',
            'Good for enthusiasm, reports, and emotional contrast when Kaien disappoints or worries his followers.'],
        'Hadrin Pell' => ['Archer / hunter', 'Mid 30s',
            'A woodsman attached to the estate lands, more comfortable sleeping under a tree than indoors. Dry humor, excellent field sense.',
            'Scout, hunter, reads tracks, notices ambushes before the “proper soldiers” do.'],
        'Damos Red-Hand' => ['Former heavy infantryman', 'Mid 40s',
            'A blunt, scarred soldier with a bad knee and a worse temper. Loves Kaien’s family, distrusts politics, and thinks most nobles are parasites.',
            'The grumbling realist. Useful when you want someone loyal but not blindly deferential.'],
        'Iria Ten-Marks' => ['Estate accountant / paymaster', 'Late 30s',
            'Thin, neat, and severe. Knows exactly how much money the estate has, how much was stolen, and which debts are real or forged.',
            'Financial adviser; can introduce estate politics, debts, forged ledgers, or claims against Kaien’s inheritance.'],
        'Nemi Old-Flour' => ['Cook / camp mother', 'Early 60s',
            'Round-faced, loud, affectionate, terrifying with a ladle. Fed Kaien when he was young and now treats everyone in the company as underfed children.',
            'Warmth, humor, emotional grounding. Also knows every servant’s rumor network.'],
        'Pellios “Pell” Anvar' => ['Groom / animal handler', 'Early 20s',
            'Nervous but gifted with horses, mules, dogs, and birds. Far braver around animals than people.',
            'Handles mounts, notices when animals react to spirits, Anathema fear, blood, or strange Essence.'],
        'Ravela Stonecot' => ['Housekeeper / domestic authority', 'Early 50s',
            'Not a soldier, but everyone obeys her. She maintained the estate household through disgrace, fear, and poverty.',
            'The “housewife” figure, but with iron authority. She cares about dignity, reputation, clothes, manners, and who gets to speak to Kaien.'],
        'Cato Meren' => ['Young swordsman', '19',
            'Eager, handsome, and very aware that he is finally part of a legend. Brave enough to be useful, inexperienced enough to be endangered.',
            'The vulnerable young loyalist; perfect for showing the risks of Kaien becoming a symbol.'],
        'Thessa Meren' => ['Cato’s older sister / crossbow guard', 'Mid 20s',
            'Far more level-headed than her brother. Watches Kaien with respect, but watches Cato with anxiety.',
            'Protective, practical, emotionally grounded soldier.'],
        'Borran Yelt' => ['Wagon-master / repairman', 'Late 40s',
            'Can fix wheels, hinges, saddle buckles, tent frames, doors, and bad moods. Missing two fingers.',
            'Logistics and travel problems; can make camp feel lived-in.'],
        'Lenna of the South Orchard' => ['Laundress / seamstress / quiet informant', 'Mid 30s',
            'Soft-spoken, almost invisible, and therefore hears everything. Repairs cloaks and shirts while listening to soldiers, servants, merchants, and guards.',
            'Excellent low-key information source; could bond naturally with Veyra.'],
        'Garin Vos' => ['Drill sergeant', 'Early 50s',
            'Old-school estate soldier who believes sloppy marching is a moral failing. Less personally warm than Oren, but deeply loyal to the institution of the house.',
            'Trains recruits, argues about discipline, reacts strongly to Kaien’s public conduct.'],
        'Melio Sar' => ['Clerk / letter-writer', 'Late 20s',
            'Educated, nervous, and ambitious in a harmless way. Writes formal letters, copies orders, keeps travel records, and desperately wants to be useful.',
            'Useful for correspondence with Maelia, Cathak officers, Marrek, or estate contacts.'],
        'Kessa Bright-Eyes' => ['Camp medic / herbalist', 'Early 40s',
            'Not a true physician, but excellent with wounds, fever, herbs, and soldier complaints. Has seen enough death to be unsentimental.',
            'Can interact well with Blaque; may be awed, suspicious, or professionally fascinated by his healing.'],
        'Jorin Ashvale' => ['Standard-bearer / household herald', 'Early 30s',
            'Carries the estate colors and knows the old formal introductions, titles, family deeds, and ceremonial phrases. He believes symbols matter.',
            'Perfect for Kaien’s public arrival in Dovestone. He is the one who makes Kaien feel like a lord arriving, not just a warrior walking in.'],
    ];

    private const IN_GREYFALLS = ['Blaque', 'Ral', 'Maelia', 'Avaros', 'Ilyatha', 'Seset'];

    private const IN_DOVESTONE = ['Solaen', 'Marek', 'Jorel'];

    /**
     * Words in the write-ups that link to a page: the word => the page's name
     * (the text spells Marek "Marrek"). Veyra has no page, so hers stays red.
     */
    private const LINK_WORDS = [
        'Kaien' => 'Kaien', 'Oren' => 'Oren Varkas', 'Cato' => 'Cato Meren', 'Blaque' => 'Blaque',
        'Maelia' => 'Maelia', 'Marrek' => 'Marek', 'Dovestone' => 'Dovestone', 'Veyra' => 'Veyra',
    ];

    /** @var array<string, string> lowercase name => page id, for this wiki */
    private array $ids = [];

    /** @var list<string> ids of the pages this run made (only those get text, place and groups) */
    private array $made = [];

    public function up(): void
    {
        if (! Character::whereKey(self::KAIEN)->exists()) {
            return;
        }
        $this->ids = WikiPage::where('character_id', self::KAIEN)->pluck('id', 'name')
            ->mapWithKeys(fn (string $id, string $name) => [mb_strtolower($name) => $id])->all();
        $this->made = [];

        DB::transaction(function () {
            $dovestone = $this->page('place', 'Dovestone');
            $greyfalls = $this->page('place', 'Greyfalls');
            $this->page('place', 'Port Calin');
            $this->page('person', 'Kaien');
            $entourage = $this->page('group', self::ENTOURAGE);
            foreach (self::IN_GREYFALLS as $name) {
                $this->page('person', $name, $greyfalls);
            }
            foreach (self::IN_DOVESTONE as $name) {
                $this->page('person', $name, $dovestone);
            }
            foreach (array_keys(self::MEMBERS) as $name) {
                $stayed = in_array($name, self::STAYED_IN_DOVESTONE, true);
                $id = $this->page('person', $name, $stayed ? $dovestone : $greyfalls);
                if (in_array($id, $this->made, true)) {
                    DB::table('wiki_page_groups')->insert(['page_id' => $id, 'group_id' => $entourage]);
                }
            }

            // The text goes in once every page exists, so the links can point at them.
            if (in_array($entourage, $this->made, true)) {
                $used = [];
                WikiPage::whereKey($entourage)->update(['body' => json_encode($this->doc([
                    $this->linked('Kaien’s entourage from the Service Estate.', $used),
                ]))]);
            }
            foreach (self::MEMBERS as $name => [$role, $age, $about, $use]) {
                $id = $this->ids[mb_strtolower($name)];
                if (! in_array($id, $this->made, true)) {
                    continue;
                }
                $used = [mb_strtolower($name) => true];
                WikiPage::whereKey($id)->update(['body' => json_encode($this->doc([
                    [$this->bold('Role:'), ...$this->linked(" {$role}", $used), $this->text(' · '), $this->bold('Age:'), $this->text(" {$age}")],
                    $this->linked($about, $used),
                    [$this->bold('Use:'), ...$this->linked(" {$use}", $used)],
                ]))]);
            }
        });
    }

    /** The page's id: an existing page of that name, or a new one placed where given. */
    private function page(string $kind, string $name, ?string $placeId = null): string
    {
        $key = mb_strtolower($name);
        if (! isset($this->ids[$key])) {
            $page = WikiPage::create([
                'character_id' => self::KAIEN, 'kind' => $kind, 'name' => $name, 'place_id' => $placeId, 'sections' => [],
            ]);
            $this->ids[$key] = $page->id;
            $this->made[] = $page->id;
        }

        return $this->ids[$key];
    }

    /**
     * The text as editor nodes, the first mention of each page on this page a link.
     *
     * @param  array<string, true>  $used  pages already linked on this page (lowercase names)
     * @return list<array<string, mixed>>
     */
    private function linked(string $text, array &$used): array
    {
        $pattern = '/\b('.implode('|', array_map('preg_quote', array_keys(self::LINK_WORDS))).')\b/u';
        $nodes = [];
        $at = 0;
        preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE);
        foreach ($matches[1] as [$word, $offset]) {
            $name = self::LINK_WORDS[$word];
            $key = mb_strtolower($name);
            if (isset($used[$key])) {
                continue;
            }
            $used[$key] = true;
            if ($offset > $at) {
                $nodes[] = $this->text(substr($text, $at, $offset - $at));
            }
            // "Cato" links to Cato Meren but still reads "Cato"; "Marrek" reads as the page's name, Marek.
            $wording = $word === $name || $word === 'Marrek' ? null : $word;
            $nodes[] = ['type' => 'wikiLink', 'attrs' => ['id' => $this->ids[$key] ?? null, 'label' => $name, 'text' => $wording]];
            $at = $offset + strlen($word);
        }
        if ($at < strlen($text)) {
            $nodes[] = $this->text(substr($text, $at));
        }

        return $nodes;
    }

    /** @return array<string, mixed> */
    private function text(string $text): array
    {
        return ['type' => 'text', 'text' => $text];
    }

    /** @return array<string, mixed> */
    private function bold(string $text): array
    {
        return ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => $text];
    }

    /**
     * @param  list<list<array<string, mixed>>>  $paragraphs
     * @return array<string, mixed>
     */
    private function doc(array $paragraphs): array
    {
        return ['type' => 'doc', 'content' => array_map(fn (array $content) => ['type' => 'paragraph', 'content' => $content], $paragraphs)];
    }

    // Adds Angel's pages only; there is nothing to undo that he may not have edited since.
    public function down(): void {}
};
