/**
 * Single source of truth for "កម្សាន្ត និងជួបជុំ / Pub & Nightlife" detection.
 * Used by foodFilters (shop tab), googlePlacesService (deep nearby search) and tests.
 * Matches ONLY genuine pubs, bars, beer gardens/halls, skybars, rooftop bars, breweries/taprooms,
 * cocktail/wine bars, lounges, night clubs, and karaoke/KTV venues.
 * Strictly EXCLUDES bakeries (ហាងនំប៉័ង), morning noodle/breakfast shops (ហាងគុយទាវពេលព្រឹក),
 * coffee shops/cafés, boba/juice/smoothie shops, vegetarian shops, and ordinary restaurants.
 */

// 1. Compound phrases where "bar" is NOT an alcohol/nightlife venue
const NOT_PUB_PHRASE_RE =
  /\b(?:juice|salad|snack|sushi|coffee|espresso|latte|matcha|milk|tea|boba|bubble\s*tea|ice\s*cream|gelato|noodle|ramen|pho|kuy\s*teav|soup|congee|smoothie|protein|candy|chocolate|breakfast|brunch|bakery|pastry|croissant|baguette|bread|cake|dessert|sandwich|burger|pizza|taco|burrito|dim\s*sum|oyster|yogurt|cereal|oxygen|energy|tapas?\s*to\s*go)\s*bars?\b|\bbar[\s-]*b[\s-]*q\b|\bbarbe?r\w*|\bbarista\w*/gi;

// 2. Hard exclusions: bakeries, morning noodle/breakfast shops, coffee/boba/juice shops, vegetarian shops, fast-food chains
const STRICT_NON_PUB_VENUE_RE =
  /ហាងនំប៉័ង|នំប៉័ង|នំខេក|ហាងនំ|១៩៩០ខេក|បង្អែម|ការ៉េម|ហាងការ៉េម|គុយទាវ|នំបញ្ចុក|បបរ|លតឆា|បាញ់កាញ់|មីស៊ុប|មីគោក|មីឆា|មីទាញ|ហ្វឺ|អាហារព្រឹក|អាហារពេលព្រឹក|បាយព្រឹក|បាយសាច់ជ្រូក|បាយមាន់|ហាងកាហ្វេ|កាហ្វេ|ការហ្វេ|តែគុជ|តែគុច|តែទឹកដោះគោ|ហាងតែ|ទឹកក្រឡុក|ទឹកផ្លែឈើ|ទឹកអំពៅ|ទឹកដូង|អាហារបួស|ម្ហូបបួស|ហាងបួស|តមសាច់|\b(?:bakery|bakeries|pastry|patisserie|croissant|baguette|banh\s*mi|n[oö]mpang|bread\s*shop|cake\s*shop|cupcake|donut|doughnut|ice\s*cream|gelato|sweet\s*lab|tous\s*les\s*jours|bengawan\s*solo|kuy\s*teav|kuyteav|noodle\s*shop|noodle\s*restaurant|noodle\s*house|rice\s*noodle|pho\s*shop|congee|porridge|breakfast\s*restaurant|morning\s*food|coffee\s*shop|coffee\s*house|coffee\s*roasters?|roastery|cafe|café|cofe|coffe|kopi|espresso|cappuccino|matcha|boba|bubble\s*tea|milk\s*tea|tea\s*house|tea\s*shop|smoothie|fruit\s*juice|fresh\s*juice|juice\s*bar|starbucks|brown\s*coffee|tube\s*coffee|amazon\s*cafe|chagee|koi\s*th[eé]|gong\s*cha|mixue|vegetarian|vegeterian|vegan|veggie|kfc|burger\s*king|lucky\s*burger|pizza\s*company|domino|lotteria|jollibee|texas\s*chicken|carl's\s*jr|bonchon|mcdonald)\b|面包店|蛋糕店|烘焙|甜品店|冰淇淋|粿条|米粉|面馆|早餐店|咖啡馆|咖啡厅|咖啡店|奶茶店|果汁|素食|斋/i;

// 3. Positive pub / bar / beer garden / skybar / nightclub / karaoke / lounge signals
const STRONG_PUB_RE =
  /កម្សាន្ត\s*និង\s*ជួបជុំ|ហាងផឹកស៊ី|ផឹកស៊ី|ហាងស្រា|ស្រាបៀរ|ស្រាបៀ|បៀរហ្គាឌិន|ហាងបៀរ|ស្កាយបារ|ផាប់|បារ(?![\u1780-\u17FF])|ក្លឹបរាត្រី|ក្លិបរាត្រី|ខារ៉ាអូខេ|ការ៉ាអូខេ|ឡៅជ៍|ស្រា(?![\u1780-\u17FF])|\b(?:pub|pubs|bar|bars|beer\s*gardens?|beer\s*house|beerhouse|beer\s*bar|beer\s*hall|beer\s*station|beer\s*club|brewery|breweries|brewpub|brewing\s*co|microbrewery|taproom|tap\s*house|night\s*clubs?|nightclubs?|night\s*life|nightlife|karaoke|ktv|wine\s*bar|sports\s*bar|cocktail\s*bar|cocktail\s*lounge|rooftop\s*bar|rooftop\s*lounge|sky\s*bar|skybar|speakeasy|disco|discotheque|gastropub|irish\s*pub|bar_and_grill|night_club|wine_bar|irish_pub|bar\s*(?:&|and)\s*grill|draft\s*beer|craft\s*beer|live\s*music\s*bar|beer\s*lounge|social\s*club|beach\s*bar|sunset\s*bar)\b|酒吧|酒馆|夜店|夜总会|啤酒花园|精酿啤酒|清吧|卡拉OK|KTV|迪厅/i;

const WEAK_PUB_RE = /\b(?:lounge|cocktails?|liquor|speakeasy|tavern|biergarten|izakaya)\b/i;
const CAFEISH_OR_PLAIN_REST_RE =
  /coffee|cafe|café|bakery|tea\s*house|bistro|កាហ្វេ|ហាងតែ|នំប៉័ង|គុយទាវ|អាម៉ុក|សម្ល/i;

export function isPubNightlifeText(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const cleaned = String(raw).replace(NOT_PUB_PHRASE_RE, ' ');
  if (STRICT_NON_PUB_VENUE_RE.test(cleaned)) {
    return false;
  }
  if (STRONG_PUB_RE.test(cleaned)) return true;
  return WEAK_PUB_RE.test(cleaned) && !CAFEISH_OR_PLAIN_REST_RE.test(cleaned);
}
