-- Images of the daily tier lists (scripts/daily-concepts.py): the library concept of each
-- card, in the order of its items, and the card shown as the list's picture (cover).
alter table public.daily_lists add column if not exists concepts text[];
alter table public.daily_lists add column if not exists cover smallint;

update public.daily_lists set concepts = array['pineapple', 'mushroom', 'cheese-wheel', 'chorizo-sausage', 'green-olives', 'bacon', 'pizza', 'anchovy', 'fried-egg', 'arugula', 'roast-chicken', 'onion'], cover = 0
  where day = '2026-10-13' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['cherry-blossom', 'sun', 'autumn-leaf', 'snowflake'], cover = 2
  where day = '2026-10-14' and array_length(items, 1) = 4;
update public.daily_lists set concepts = array['croissant', 'pain-au-chocolat', 'pretzel', 'brioche', 'apple-turnover', 'pain-raisin', 'bagel', 'waffle', 'donut', 'pancake'], cover = 0
  where day = '2026-10-15' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['bat-mask', 'spider-web', 'star-shield', 'war-hammer', 'iron-helmet', 'green-fist', 'lightning-bolt', 'trident', 'golden-tiara', 'black-panther', 'mystic-amulet', 'ant'], cover = 0
  where day = '2026-10-16' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['bed', 'brunch-plate', 'hiking-boot', 'film-clapperboard', 'gamepad', 'open-book', 'broom', 'pot-au-feu-pot', 'dumbbell', 'bathtub'], cover = 0
  where day = '2026-10-17' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['ketchup-bottle', 'mayonnaise-jar', 'mustard-jar', 'spicy-sauce-bottle', 'harissa-tube', 'garlic-bulb', 'honey-jar', 'soy-sauce-bottle', 'cheese-sauce-bowl', 'barbecue-grill', 'gherkin', 'pesto-jar'], cover = 0
  where day = '2026-10-18' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['retro-camera', 'music-note', 'play-button', 'ghost', 'little-bird', 'thumbs-up', 'necktie', 'push-pin', 'alien-head', 'speech-bubble', 'gamepad', 'television'], cover = 0
  where day = '2026-10-19' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['yule-log', 'cookie', 'chocolate-truffle', 'orange-fruit', 'gingerbread-loaf', 'panettone', 'wrapped-candy', 'chestnut', 'cupcake', 'christmas-pudding'], cover = 0
  where day = '2026-10-20' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['dog', 'black-cat', 'rabbit', 'hamster', 'goldfish', 'parrot', 'turtle', 'snake', 'chameleon', 'wild-horse', 'mouse', 'hedgehog'], cover = 0
  where day = '2026-10-21' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['card-fan', 'poker-chips', 'playing-card', 'gold-crown', 'sword-and-shield', 'tarot-card', 'spell-book', 'numbered-card', 'round-card-tin', 'card-solitaire'], cover = 2
  where day = '2026-10-22' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['sunrise', 'cereal-bowl', 'big-clock', 'pillow', 'cookie', 'sunset-sea', 'fork-and-knife', 'crescent-moon', 'bed'], cover = 0
  where day = '2026-10-23' and array_length(items, 1) = 9;
update public.daily_lists set concepts = array['vampire-head', 'zombie-hand', 'ghost', 'witch-hat', 'jack-o-lantern', 'spider', 'wolf', 'skull', 'clown-face', 'bat', 'troll', 'tombstone'], cover = 4
  where day = '2026-10-24' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['raclette-cheese', 'peppercorn-cheese', 'wine-glass', 'herb-cheese', 'smoked-cheese', 'goat-cheese-log', 'morbier', 'reblochon', 'blue-cheese-wedge', 'comte-wedge'], cover = 0
  where day = '2026-10-25' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['ski', 'snowboard', 'ice-skate', 'sled', 'snowshoes', 'hockey-stick', 'ice-axe', 'cross-country-ski', 'hot-chocolate', 'massage-stone'], cover = 0
  where day = '2026-10-26' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['fish-fingers', 'lasagna', 'mashed-potato', 'carrot', 'custard-flan', 'shepherd-pie-dish', 'tabbouleh', 'broccoli', 'cordon-bleu', 'rice-pudding', 'quiche', 'chocolate-mousse'], cover = 0
  where day = '2026-10-27' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['lion', 'cowboy-hat', 'clownfish', 'snowflake', 'green-ogre', 'balloon-house', 'chef-rat', 'cute-robot', 'dragon', 'japanese-bathhouse', 'superhero-cape', 'spider-web'], cover = 0
  where day = '2026-10-28' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['coffee-cup', 'matcha', 'teacup', 'hot-chocolate', 'herbal-tea', 'warm-milk-mug', 'mulled-wine', 'mate-gourd', 'chai-latte', 'honey-jar'], cover = 0
  where day = '2026-10-29' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['dish-sponge', 'clothes-iron', 'laundry-basket', 'toilet', 'window-squeegee', 'vacuum-cleaner', 'trash-can', 'pillow', 'frying-pan', 'shopping-cart', 'ice-cube', 'litter-box'], cover = 5
  where day = '2026-10-30' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['gummy-bear', 'strawberry-candy', 'lollipop', 'caramel-candy', 'chocolate-bar', 'gummy-snake', 'marshmallow', 'cherry', 'sour-belt', 'bubble-gum', 'sour-candy', 'nougat'], cover = 0
  where day = '2026-10-31' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['alarm-clock', 'taco', 'camel', 'beer-mugs', 'party-popper', 'shopping-bag', 'sofa'], cover = 4
  where day = '2026-11-01' and array_length(items, 1) = 7;
update public.daily_lists set concepts = array['pumpkin', 'potato', 'carrot', 'cabbage', 'leek', 'sweet-potato', 'chestnut', 'mushroom', 'broccoli', 'beetroot', 'garlic-bulb', 'spinach'], cover = 0
  where day = '2026-11-02' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['metro', 'bus', 'tram', 'train', 'high-speed-train', 'ferry-boat', 'cable-car', 'bicycle', 'kick-scooter', 'taxi'], cover = 0
  where day = '2026-11-03' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['sun', 'pillow', 'cardboard-box', 'headphone', 'strawberry-cake', 'black-cat', 'rain-cloud', 'book', 'striped-sock', 'pizza'], cover = 5
  where day = '2026-11-04' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['acoustic-guitar', 'grand-piano', 'drum-kit', 'violin', 'saxophone', 'trumpet', 'banjo', 'accordion', 'flute', 'djembe', 'microphone', 'harp'], cover = 0
  where day = '2026-11-05' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['burger', 'french-fries', 'kebab', 'french-tacos', 'pizza', 'fried-chicken', 'sushi', 'sandwich', 'hot-dog', 'noodle-box', 'falafel', 'ramen'], cover = 0
  where day = '2026-11-06' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['astronaut-helmet', 'chef-hat', 'gamepad', 'suitcase', 'dolphin', 'film-clapperboard', 'soccer-ball', 'paint-palette', 'dinosaur-fossil', 'airplane', 'book', 'chocolate-bar'], cover = 0
  where day = '2026-11-07' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['glass-slipper', 'red-apple', 'enchanted-rose', 'mermaid-tail', 'red-cap', 'little-pig', 'gingerbread-house', 'cat-in-boots', 'spinning-wheel', 'pea-pod'], cover = 0
  where day = '2026-11-08' and array_length(items, 1) = 10;
update public.daily_lists set concepts = array['spaghetti', 'fusilli', 'farfalle', 'tagliatelle', 'conchiglie', 'ravioli', 'lasagna', 'penne', 'gnocchi', 'coquillettes', 'macaroni', 'linguine'], cover = 0
  where day = '2026-11-09' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['map-pin', 'music-note', 'retro-camera', 'speech-bubble', 'sun-behind-cloud', 'credit-card', 'television', 'shopping-cart', 'car', 'notepad', 'alarm-clock', 'vintage-microphone'], cover = 0
  where day = '2026-11-10' and array_length(items, 1) = 12;
update public.daily_lists set concepts = array['roast-turkey', 'oyster', 'shrimp', 'foie-gra-terrine', 'cheese-wheel', 'champagne-bottle', 'salmon', 'lamb-shank', 'fondue-pot', 'raclette-grill', 'lobster', 'yule-log'], cover = 0
  where day = '2026-11-11' and array_length(items, 1) = 12;
