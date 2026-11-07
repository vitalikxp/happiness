import { id } from './define.ts';

// Illustration subjects, one per card (art/STYLE.md). English, because image models read it best.
// A subject names what is drawn, not how: `artPrompt` wraps it in the pack's style template.
// People stay small, seen at a distance or from behind, so one picture fits both partner versions
// and every hero. Never name the original game, its cards or its artists here.

const subjects = (kind: string, list: Record<string, string>) =>
  Object.fromEntries(Object.entries(list).map(([slug, subject]) => [id(kind, slug), subject]));

export const artSubjects: Record<string, string> = {
  ...subjects('project', {
    learn_runes: 'a desk with an open grimoire, glowing carved runestones and a candle',
    tame_familiar:
      'a black cat sitting proudly on a pile of spellbooks, a small figure offering it a treat',
    build_tower:
      'a slender wizard tower under construction on a green hill, scaffolding and cranes',
    read_stars: 'a figure on a rooftop with an astrolabe under a sky full of constellations',
    elemental_magic: 'a figure holding a swirl of fire, water, wind and stone in the air',
    forge_blade: 'a glowing sword on an anvil, sparks flying, hammer and tongs nearby',
    build_ship: 'a wooden ship on the slipway of a small harbour, carpenters at work',
    weave_tapestry: 'a large loom with an unfinished tapestry of a winding road',
    brew_ale: 'copper brewing vats, barrels and a frothing tankard on a table',
    carve_statue: 'a half-carved marble statue emerging from a block, chisels on the floor',
    write_chronicle: 'an open chronicle with an illuminated page, quill and inkwell by a window',
    court_etiquette: 'a long banquet table with many forks and goblets, a bowing courtier',
    compose_ballad: 'a lute leaning on a stool beside sheets of music and a crumpled draft',
    found_salon: 'a cosy salon with armchairs, tea service and guests reading verses',
    found_shelter: 'a modest stone house with an open door and warm light, children at play',
    pilgrimage: 'a pilgrim with a staff walking a long road toward a distant shrine',
    monk_training: 'a mountain monastery courtyard, a bell, a figure meditating',
    healing_arts: 'a healer’s table with bandages, salves, a mortar and a bowl of herbs',
    herbalism: 'bundles of drying herbs hanging from beams, jars with labels',
    grow_garden: 'a walled garden with young apple trees, a watering can and beds of flowers',
    beekeeping: 'straw beehives in a meadow, bees, a jar of golden honey',
    map_wilds:
      'an unfinished map on a table with compass, dividers and a tiny dragon in the margin',
    climb_dragon_peak:
      'a jagged snowy peak above the clouds, a tiny climber with a flag at the top',
    fencing_school: 'a fencing hall with crossed rapiers on the wall and a practice dummy',
    horse_riding: 'a saddled horse in a paddock, a rider leading it by the reins',
    archery: 'a straw target with an arrow in the centre, a longbow and quiver',
    lead_militia: 'town gate with a banner, a small line of guards with spears at dusk',
    trade_route: 'a caravan of mules on a winding road between two cities',
    open_shop: 'a small shop front with an awning, a hanging sign and goods on the counter',
    learn_languages: 'stacked dictionaries, scrolls in different scripts and a globe',
    knight_tourney: 'a jousting list with two knights charging, pennants and a crowd',
    bard_contest: 'a festival stage with three lutes and a laurel wreath on a cushion',
    harvest_fair: 'an autumn fair with pumpkins, cider barrels and striped tents',
    wizard_duel: 'two wizards on a stone circle exchanging sparkling spells, a frog judge',
    cooking_contest: 'a long table of pies and roasts, a steaming cauldron, a red pepper',
    sphinx_riddles: 'a stone sphinx at the mouth of a desert pass, a small traveller before it',
    archery_contest: 'a row of targets in a meadow, a silver arrow on a cushion',
    masquerade: 'a ballroom with masked dancers, candles and a mask on the floor',
    smith_contest: 'several forges side by side in a square, a crowd watching the sparks',
    winter_festival: 'a snowy square with a bonfire, lanterns and people singing',
    dragon_hunt: 'a small party with spears on a ridge, a large dragon asleep on a hoard below',
    dungeon_delve: 'stone stairs descending into a torchlit dungeon, a chest and a goblin peeking',
    cathedral: 'a cathedral under construction, wooden cranes, masons on the walls',
    royal_wedding: 'a castle hall decorated with garlands, a long feast table and musicians',
    northern_expedition: 'sledges and tents on a snowfield under northern lights, a polar bear',
    theatre_play: 'a small wooden stage with a painted backdrop, curtains and actors bowing',
    great_library: 'a vast vaulted library with tall shelves, ladders and reading desks',
    merchant_fleet: 'a fleet of sailing ships with the same flag leaving a harbour',
  }),
  ...subjects('item', {
    house: 'a cosy timbered house with a chimney and a little garden fence',
    horse: 'a fine chestnut horse in a stable, saddle on the rail',
    castle: 'an old family castle on a hill with a banner on the tower',
    ship: 'a single-masted sailing ship at anchor, gulls overhead',
    wine_cellar: 'a vaulted cellar with rows of barrels and dusty bottles',
    wardrobe: 'an open wardrobe with fine cloaks, hats and boots',
    jewelry: 'a small open casket with rings, a necklace and gemstones',
    armor: 'a suit of plate armour on a stand with a helmet and shield',
    sword: 'a sword and a shield hanging over a fireplace',
    carriage: 'a painted carriage with two horses on a cobbled road',
    portrait: 'an ornate framed portrait on a wall, its eyes looking sideways',
    tavern_share: 'a busy tavern with a reserved corner table and a sign with a goose',
    lute: 'a lute with ribbons on an armchair',
    library: 'a home library with shelves to the ceiling and a reading chair',
    workshop: 'a workbench with tools, wood shavings and half-made toys',
    crystal_ball: 'a crystal ball on a velvet cushion showing rain clouds inside',
    telescope: 'a brass telescope by an open window, a full moon outside',
    hounds: 'three hounds lying by a hearth, a horn on the wall',
    signet_ring: 'a gold signet ring pressing red wax on a letter',
    gazebo: 'a garden gazebo with a tea table at sunset',
    bathhouse: 'a wooden bathhouse in steam, birch brooms and a bucket',
    cat: 'a fat ginger cat asleep on a cushion by the window',
    fireplace: 'a stone fireplace with crackling logs, a plaid blanket and a book',
    carp_pond: 'a quiet pond with golden carp and water lilies',
  }),
  ...subjects('activity', {
    feast: 'a long table with roast meat, mead jugs and singing guests',
    fair: 'a village fair with gingerbread stalls, jesters and a friendly bear',
    hunt: 'riders and hounds galloping through an autumn forest',
    picnic: 'a blanket on a meadow with a basket, bread and cheese, a few ants',
    journey: 'a road winding over hills toward a far city, a traveller with a pack',
    hot_springs: 'steaming hot springs among rocks, towels on a stone',
    circus: 'a striped circus tent, an acrobat and a small dragon on a pedestal',
    dice: 'dice and coins on a tavern table, candlelight',
    wine_tasting: 'goblets of red and white wine, grapes and a cheese board',
    boat_trip: 'a rowing boat on a calm river under willows',
    theatre: 'theatre boxes and a lit stage seen from the stalls',
    concert: 'musicians with harp, viol and flute in a candlelit hall',
    lectures: 'an academy lecture hall, a magister pointing at a diagram, sparks from robes',
    curiosities: 'a cabinet of curiosities with a stuffed basilisk, skulls and shells',
    ball: 'a palace ballroom with dancing couples under chandeliers',
    tourney_watch: 'a covered stand with banners overlooking a jousting field',
  }),
  ...subjects('job', {
    alchemist_apprentice:
      'a cluttered alchemy lab with bubbling flasks and a small explosion of smoke',
    tower_copyist: 'a scriptorium desk high in a tower, stacks of pages, a quill',
    court_astrologer: 'a palace observatory with an armillary sphere and star charts',
    potion_master: 'shelves of coloured potion bottles, a cauldron and a ladle',
    archmage: 'a council chamber at the top of a tower with a high carved chair and a staff',
    academy_rector: 'an academy courtyard with spires and students in robes',
    smith_apprentice: 'a village smithy with an anvil, bellows and a horseshoe',
    street_minstrel: 'a street corner with a hat full of coins, a lute and pigeons',
    jeweler: 'a jeweller’s bench with loupe, tweezers and a crown being set with stones',
    court_painter: 'an easel with a royal portrait in progress, palette and brushes',
    royal_architect:
      'blueprints of a stone bridge on a drafting table, a bridge outside the window',
    kings_bard: 'a golden harp by a throne, a royal banner behind',
    guild_clerk: 'a counting-house desk with ledgers, seals and an abacus',
    town_crier: 'a crier’s bell and a scroll on a market square with a fountain',
    guild_treasurer: 'an iron-bound chest with a key on a chain, piles of coins',
    free_city_envoy: 'a negotiation table with two banners, sealed treaties and a quill',
    chancellor: 'a chancellor’s desk with the great seal, a crown on a cushion nearby',
    guild_master: 'a harbour full of ships flying the same guild flag, a guildhall',
  }),
  ...subjects('partner', {
    elven_ranger: 'a longbow, a green cloak and a leaf-shaped brooch in a forest glade',
    dwarf_smith: 'a dwarven forge under a mountain, a war hammer and a foaming tankard',
    court_chronicler: 'a chronicler’s writing desk with a half-written page and a court seal',
    wandering_bard: 'a lute and a travelling bag by a roadside inn at dusk',
    temple_healer: 'a temple infirmary with white linen, candles and healing herbs',
    halfling_innkeeper: 'a round-door inn with a goose sign and a pie on the windowsill',
    merchant_heir: 'a merchant house’s counting room with scales, silk and coins',
    errant_knight: 'a knight’s helmet, shield and horse resting under an oak',
    forest_witch: 'a forest hut with herbs, a bubbling pot and a knowing cat',
    ship_captain: 'a captain’s cabin with a map, a compass and a tricorn hat',
    fire_magister: 'a magister’s study with a flaming orb and singed books',
    orc_drummer: 'a big war drum decorated with flowers in a meadow',
  }),
  ...subjects('trait', {
    sage_star: 'a cradle under a window with one bright star, books stacked nearby',
    forge_child: 'a cradle by a forge with a tiny wooden hammer as a toy',
    herald_voice: 'a baby’s rattle shaped like a herald’s trumpet on a market square',
    merchant_blood: 'a cradle with a toy scale and three shiny coins',
    silver_spoon: 'a silver spoon on a lace pillow in a rich nursery',
    storm_night: 'a cradle by a window, lightning over the hills outside',
    fairy_kiss: 'a fairy hovering over a cradle, glittering dust',
    quiet_soul: 'a cradle in a calm garden, a sleeping cat beside it',
    lucky_moon: 'a cradle under a huge golden full moon, a four-leaf clover',
    wanderer_blood: 'a cradle in a covered wagon on the road',
    hearth_keeper: 'a cradle by a glowing hearth, a kettle and warm socks',
    iron_will: 'a cradle with an iron rattle, a candle burning late into the night',
  }),
  ...subjects('goal', {
    keeper_of_lore: 'an allegory of wisdom: an owl on a tower of books',
    master_of_crafts: 'an allegory of craft: crossed hammer and brush over a laurel',
    name_in_chronicles: 'an allegory of fame: a trumpet and a laurel over an open chronicle',
    rich_legacy: 'an allegory of wealth: an overflowing chest of gold and a family crest',
    life_work: 'an allegory of work: a finished cathedral spire with a laurel wreath',
    full_cup: 'an allegory of plenty: a horn of plenty over a cosy house',
    big_family: 'an allegory of family: a large oak with many nests',
    guild_peak: 'an allegory of rank: a guild chain of office on a cushion',
    long_life: 'an allegory of long life: an old oak and an hourglass with much sand left',
    joy_of_life: 'an allegory of joy: a goblet, a lute and flowers in the sun',
    master_builder: 'an allegory of building: a compass and a set square over two finished towers',
    treasury_of_talents:
      'an allegory of talents: a book, a hammer and a banner in a treasure chest',
  }),
};

/** The style every prompt shares (art/STYLE.md §2): medium, palette, framing and mood. */
export const ART_STYLE =
  'Medieval illuminated manuscript miniature. Egg tempera and shell gold on cream parchment, ' +
  'fine iron-gall ink outlines, flat medieval perspective, small figures, ' +
  'palette of cinnabar red, lapis blue, verdigris green, ochre and burnished gold. ' +
  'Warm, cozy, gently humorous fairy-tale mood. ' +
  'Full-bleed landscape scene, 4:3, no border or frame (the game draws the frame).';

/** What every prompt must avoid (art/STYLE.md §3). */
export const ART_NEGATIVE =
  'text, letters, captions, signature, watermark, photo, 3D render, anime, glossy digital ' +
  'painting, dark horror, gore, modern objects, close-up faces';

export function artPrompt(subject: string): string {
  return `${ART_STYLE} Subject: ${subject}. No text or lettering anywhere.`;
}
