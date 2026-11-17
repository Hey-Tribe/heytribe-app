// Same sections and word rules as the web app (SECTIONS in spa/app.js), so both sort items the same way.
const SECTIONS: [string, RegExp][] = [
  ["produce", /avocado|banana|apple|cilantro|lettuce|tomato|onion|lime|lemon|berr|potato|carrot|pepper|spinach|fruit|veg|garlic|cucumber|grape|orange|mango|plantain|corn\b/i],
  ["dairy", /milk|egg|cheese|yogurt|yoghurt|butter|cream/i],
  ["bakery", /bread|tortilla|bagel|bun\b|buns|roll|pita|muffin/i],
  ["meat & fish", /chicken|beef|pork|fish|turkey|salmon|bacon|sausage|shrimp|steak|ham\b/i],
  ["pantry", /rice|bean|pasta|flour|sugar|oil|cereal|coffee|salt|sauce|can\b|cans|oat|honey|spice|salsa|chips|snack|cracker|tea\b/i],
  ["baby", /diaper|wipe|formula|puffs|baby|pacifier/i],
  ["household", /paper|soap|detergent|towel|trash|foil|sponge|bleach|batter|bulb|toilet/i],
  ["pharmacy", /vitamin|tylenol|ibuprofen|bandage|medicine|prescription|toothpaste|shampoo/i],
];
export const sectionFor = (t: string) => (SECTIONS.find(([, r]) => r.test(t)) || ["other"])[0];
export const ORDER = [...SECTIONS.map(s => s[0]), "other"];
