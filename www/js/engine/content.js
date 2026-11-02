// Game content: ingredients, the Yatra (journey) across India, dishes and real recipe cards.

export const INGREDIENTS = [
  { id: 'mirchi', en: 'Chilli', hi: 'मिर्ची', hex: '#e2262f' },
  { id: 'nimbu', en: 'Lemon', hi: 'नींबू', hex: '#f6c21c' },
  { id: 'pudina', en: 'Mint', hi: 'पुदीना', hex: '#2fae4f' },
  { id: 'pyaaz', en: 'Onion', hi: 'प्याज़', hex: '#9b3fb5' },
  { id: 'lehsun', en: 'Garlic', hi: 'लहसुन', hex: '#efe6d2' },
  { id: 'chai', en: 'Kulhad Chai', hi: 'कुल्हड़ चाय', hex: '#b5651d' },
];
export const DOUGH = { id: 'atta', en: 'Knead dough', hi: 'आटा गूंधें' };
export const LOCK = { id: 'jaali', en: 'Free from jaali', hi: 'जाली खोलें' };

// Ingredient indices: 0 mirchi, 1 nimbu, 2 pudina, 3 pyaaz, 4 lehsun, 5 chai
const d = (en, hi, uses) => ({ en, hi, uses });

export const CITIES = [
  {
    id: 'mumbai', en: 'Mumbai', hi: 'मुंबई', tint: ['#ff9a3c', '#ff4f7b'], motif: 'sea',
    blurb: { en: 'City of dreams & street food', hi: 'सपनों और स्ट्रीट फ़ूड का शहर' },
    dishes: [d('Cutting Chai', 'कटिंग चाय', [5, 2]), d('Pav Bhaji', 'पाव भाजी', [3, 1, 4]), d('Bhel Puri', 'भेल पूरी', [3, 1, 2]), d('Misal Pav', 'मिसल पाव', [0, 3]), d('Vada Pav', 'वड़ा पाव', [4, 0])],
    recipe: {
      en: 'Vada Pav', hi: 'वड़ा पाव', time: '40 min', serves: '4',
      ingredients: ['4 boiled potatoes, mashed', '4 garlic cloves + 3 green chillies, crushed', '½ tsp mustard seeds, curry leaves, pinch of hing', '½ tsp turmeric, salt, coriander', '1 cup besan + pinch of soda for batter', '4 pav, dry garlic chutney, oil'],
      steps: ['Heat 1 tbsp oil; crackle mustard seeds, curry leaves and hing.', 'Add the garlic–chilli paste and turmeric; sauté 30 seconds.', 'Mix in potatoes, salt and coriander. Cool and shape into balls.', 'Whisk besan, salt, turmeric and soda with water into a thick batter.', 'Dip each ball and deep-fry on medium heat till golden.', 'Slit pav, spread chutney, tuck in the vada and serve hot.'],
      tip: { en: 'Dadi says: fry on medium heat — high heat browns the outside but leaves the batter raw inside.', hi: 'दादी कहती हैं: मध्यम आंच पर तलो — तेज़ आंच पर ऊपर से भूरा और अंदर से कच्चा रह जाता है।' },
    },
  },
  {
    id: 'ahmedabad', en: 'Ahmedabad', hi: 'अहमदाबाद', tint: ['#ffd23f', '#ff8c42'], motif: 'kite',
    blurb: { en: 'Kites, garba & farsan', hi: 'पतंग, गरबा और फरसाण' },
    dishes: [d('Khandvi', 'खांडवी', [1, 2]), d('Thepla', 'थेपला', [2, 4]), d('Undhiyu', 'उंधियू', [2, 4, 0]), d('Masala Chaas', 'मसाला छाछ', [2, 5]), d('Dhokla', 'ढोकला', [1, 0])],
    recipe: {
      en: 'Khaman Dhokla', hi: 'खमण ढोकला', time: '35 min', serves: '4',
      ingredients: ['1½ cups besan', '1 tbsp semolina (optional)', '1 tsp ginger–green chilli paste', '1 tbsp lemon juice, 1 tbsp sugar, salt', '1 tsp Eno fruit salt', 'Tempering: mustard seeds, green chillies, curry leaves, 1 tbsp sugar in ½ cup water'],
      steps: ['Whisk besan, semolina, ginger–chilli paste, lemon, sugar and salt with ~1 cup water to a smooth batter.', 'Rest 10 minutes. Grease a tin and heat water in a steamer.', 'Stir Eno into the batter — it will froth — and pour into the tin at once.', 'Steam 15–18 minutes until a toothpick comes out clean.', 'Make the tempering, add the sugar-water, boil once and pour over the cut dhokla.', 'Garnish with coriander and coconut.'],
      tip: { en: 'Dadi says: add Eno only when the steamer is already bubbling, or the dhokla will not rise.', hi: 'दादी कहती हैं: ईनो तभी डालो जब स्टीमर में पानी उबल रहा हो, वरना ढोकला फूलेगा नहीं।' },
    },
  },
  {
    id: 'jaipur', en: 'Jaipur', hi: 'जयपुर', tint: ['#ff6f91', '#c34a36'], motif: 'fort',
    blurb: { en: 'The Pink City’s royal kitchens', hi: 'गुलाबी नगरी की शाही रसोई' },
    dishes: [d('Mirchi Vada', 'मिर्ची वड़ा', [0, 4]), d('Gatte ki Sabzi', 'गट्टे की सब्ज़ी', [3, 0]), d('Ker Sangri', 'केर सांगरी', [0, 1]), d('Masala Chai', 'मसाला चाय', [5, 4]), d('Dal Baati', 'दाल बाटी', [4, 3, 0])],
    recipe: {
      en: 'Dal Baati', hi: 'दाल बाटी', time: '1 hr', serves: '4',
      ingredients: ['2 cups wheat flour, ¼ cup semolina, ¼ cup ghee, salt, ajwain', '1 cup mixed dal (toor, chana, moong), soaked', '1 onion, 2 tomatoes, ginger, garlic, green chillies', 'Turmeric, red chilli, cumin, hing', 'Extra ghee to serve'],
      steps: ['Rub flour, semolina, ajwain, salt and ghee together; knead a stiff dough with water.', 'Shape into balls and bake at 200°C (or in a gas tandoor) for ~30 minutes, turning once.', 'Pressure-cook the dals with turmeric and salt for 3 whistles.', 'Temper cumin and hing in ghee; add onion, garlic, ginger, chillies and tomatoes.', 'Pour in the dal and simmer 5 minutes.', 'Crack the hot baatis, dip in melted ghee and serve with dal.'],
      tip: { en: 'Dadi says: a stiff dough makes a crumbly baati — don’t add too much water.', hi: 'दादी कहती हैं: आटा सख़्त गूंधो, तभी बाटी खस्ता बनेगी।' },
    },
  },
  {
    id: 'delhi', en: 'Delhi', hi: 'दिल्ली', tint: ['#f9c74f', '#f3722c'], motif: 'gate',
    blurb: { en: 'Chaat galiyan of Chandni Chowk', hi: 'चांदनी चौक की चाट गलियां' },
    dishes: [d('Aloo Tikki', 'आलू टिक्की', [0, 2]), d('Dahi Bhalla', 'दही भल्ला', [2, 1]), d('Rajma Chawal', 'राजमा चावल', [3, 4]), d('Paranthe', 'पराठे', [0, 3]), d('Chole Bhature', 'छोले भटूरे', [3, 0, 1])],
    recipe: {
      en: 'Chole', hi: 'छोले', time: '45 min (+ overnight soak)', serves: '4',
      ingredients: ['1 cup kabuli chana, soaked overnight', '1 tea bag (for colour)', '2 onions, 2 tomatoes, ginger–garlic paste, 2 green chillies', 'Chole masala, cumin, red chilli, amchur', 'Oil, salt, coriander, lemon'],
      steps: ['Pressure-cook chana with salt and the tea bag for 5–6 whistles; discard the tea bag.', 'Heat oil, crackle cumin, then fry onions till deep golden.', 'Add ginger–garlic and chillies, then tomatoes; cook till oil separates.', 'Stir in chole masala, chilli and amchur; add chana with its water.', 'Mash a few chickpeas and simmer 15 minutes till thick.', 'Finish with coriander and a squeeze of lemon.'],
      tip: { en: 'Dadi says: patience with the onions — deep golden onions give chole their colour and taste.', hi: 'दादी कहती हैं: प्याज़ को धीरज से सुनहरा भूनो — छोले का रंग और स्वाद इसी से आता है।' },
    },
  },
  {
    id: 'amritsar', en: 'Amritsar', hi: 'अमृतसर', tint: ['#ffcf56', '#e76f51'], motif: 'temple',
    blurb: { en: 'Langar, lassi & golden dhabas', hi: 'लंगर, लस्सी और सुनहरे ढाबे' },
    dishes: [d('Amritsari Kulcha', 'अमृतसरी कुलचा', [3, 4]), d('Pindi Chole', 'पिंडी छोले', [0, 3]), d('Kadhi Pakora', 'कढ़ी पकौड़ा', [3, 0]), d('Meethi Lassi', 'मीठी लस्सी', [2, 5]), d('Sarson ka Saag', 'सरसों का साग', [2, 4, 0])],
    recipe: {
      en: 'Sarson ka Saag', hi: 'सरसों का साग', time: '1 hr', serves: '4',
      ingredients: ['500 g mustard greens + 200 g spinach + a handful of bathua', '2 tbsp makki atta (maize flour)', '1 onion, 6 garlic cloves, 2-inch ginger, 3 green chillies', '2 tbsp ghee or white butter', 'Salt'],
      steps: ['Wash and chop the greens; boil with ginger, chillies and salt until soft (about 30 min).', 'Blend coarsely, return to the pot.', 'Sprinkle in makki atta while stirring; simmer 15 minutes.', 'Heat ghee, fry onion and garlic till golden.', 'Pour the tadka over the saag and mix.', 'Serve with makki roti and a dollop of white butter.'],
      tip: { en: 'Dadi says: saag always tastes better the next day.', hi: 'दादी कहती हैं: साग अगले दिन और भी स्वादिष्ट लगता है।' },
    },
  },
  {
    id: 'kolkata', en: 'Kolkata', hi: 'कोलकाता', tint: ['#ff8fab', '#b5179e'], motif: 'bridge',
    blurb: { en: 'Adda, mishti & phuchka', hi: 'अड्डा, मिष्टी और फुचका' },
    dishes: [d('Phuchka', 'फुचका', [2, 1, 0]), d('Jhal Muri', 'झाल मुड़ी', [3, 0]), d('Aloo Posto', 'आलू पोस्तो', [0, 4]), d('Bhaar Cha', 'भाड़ की चाय', [5, 1]), d('Mishti Doi', 'मिष्टी दोई', [5, 2])],
    recipe: {
      en: 'Mishti Doi', hi: 'मिष्टी दोई', time: '30 min (+ 8 hr setting)', serves: '4',
      ingredients: ['1 litre full-fat milk', '½ cup sugar (or jaggery) for caramel', '2 tbsp sugar', '3 tbsp thick curd (starter), at room temperature', 'Clay pots (kulhads) if you have them'],
      steps: ['Boil and reduce the milk to about two-thirds, stirring often.', 'Melt ½ cup sugar to an amber caramel and carefully stir it into the milk.', 'Add 2 tbsp sugar and cool until just warm to the touch.', 'Whisk the curd smooth and mix it in well.', 'Pour into clay pots, cover and keep in a warm place for 8 hours.', 'Chill before serving.'],
      tip: { en: 'Dadi says: clay pots soak up extra water, so the doi sets thick and creamy.', hi: 'दादी कहती हैं: मिट्टी के बर्तन पानी सोख लेते हैं, इसलिए दोई गाढ़ी जमती है।' },
    },
  },
  {
    id: 'hyderabad', en: 'Hyderabad', hi: 'हैदराबाद', tint: ['#c77dff', '#7b2cbf'], motif: 'minar',
    blurb: { en: 'Nawabi flavours & Irani chai', hi: 'नवाबी ज़ायका और ईरानी चाय' },
    dishes: [d('Irani Chai', 'ईरानी चाय', [5, 4]), d('Mirchi ka Salan', 'मिर्ची का सालन', [0, 3]), d('Bagara Baingan', 'बघारे बैंगन', [3, 4]), d('Double ka Meetha', 'डबल का मीठा', [5, 1]), d('Veg Dum Biryani', 'वेज दम बिरयानी', [3, 2, 0])],
    recipe: {
      en: 'Veg Dum Biryani', hi: 'वेज दम बिरयानी', time: '1 hr 15 min', serves: '4',
      ingredients: ['2 cups basmati rice, soaked 30 min', '3 cups mixed vegetables (carrot, beans, peas, potato)', '1 cup curd, ginger–garlic paste, biryani masala', '2 onions, sliced and fried crisp (birista)', 'Mint and coriander leaves, saffron in warm milk', 'Whole spices: bay leaf, cardamom, cloves, cinnamon; ghee'],
      steps: ['Marinate vegetables in curd, ginger–garlic, biryani masala, salt, half the birista and mint for 20 minutes.', 'Boil rice with whole spices and salt until 70% cooked; drain.', 'Spread the vegetables in a heavy pot; layer the rice over them.', 'Top with saffron milk, ghee, mint and the remaining birista.', 'Seal the lid (dough or foil) and cook on the lowest heat for 25 minutes.', 'Rest 5 minutes, then gently mix from the side.'],
      tip: { en: 'Dadi says: never stir biryani from the top — fold from the side to keep the grains long.', hi: 'दादी कहती हैं: बिरयानी ऊपर से मत चलाओ — किनारे से मिलाओ ताकि चावल लंबे रहें।' },
    },
  },
  {
    id: 'chennai', en: 'Chennai', hi: 'चेन्नई', tint: ['#4cc9f0', '#4361ee'], motif: 'beach',
    blurb: { en: 'Filter kaapi & banana-leaf meals', hi: 'फ़िल्टर कॉफ़ी और केले के पत्ते का भोजन' },
    dishes: [d('Rasam', 'रसम', [0, 4, 1]), d('Lemon Rice', 'लेमन राइस', [1, 0]), d('Pongal', 'पोंगल', [4, 2]), d('Filter Kaapi', 'फ़िल्टर कॉफ़ी', [5, 4]), d('Sambar', 'सांबर', [3, 0, 1])],
    recipe: {
      en: 'Sambar', hi: 'सांबर', time: '45 min', serves: '4',
      ingredients: ['¾ cup toor dal', 'Lemon-sized ball of tamarind, soaked', '2 cups vegetables (drumstick, pumpkin, brinjal, shallots)', '2 tbsp sambar powder, turmeric, jaggery', 'Tempering: mustard seeds, dry red chillies, curry leaves, hing'],
      steps: ['Pressure-cook dal with turmeric until mushy; mash.', 'Boil the vegetables in tamarind water with salt until tender.', 'Add sambar powder and a little jaggery; simmer 5 minutes.', 'Pour in the dal, adjust thickness with water and boil 5 more minutes.', 'Temper mustard seeds, red chillies, curry leaves and hing in oil.', 'Pour over the sambar and top with coriander.'],
      tip: { en: 'Dadi says: a small piece of jaggery balances the tamarind beautifully.', hi: 'दादी कहती हैं: थोड़ा सा गुड़ इमली की खटास को बढ़िया संतुलित करता है।' },
    },
  },
  {
    id: 'goa', en: 'Goa', hi: 'गोवा', tint: ['#06d6a0', '#118ab2'], motif: 'palm',
    blurb: { en: 'Susegad living & coconut curries', hi: 'सुसेगाद जीवन और नारियल करी' },
    dishes: [d('Sol Kadhi', 'सोल कढ़ी', [4, 2]), d('Ros Omelette', 'रोस ऑमलेट', [3, 0]), d('Mushroom Xacuti', 'मशरूम शाकुती', [0, 3, 4]), d('Kokum Sharbat', 'कोकम शरबत', [1, 2]), d('Goan Veg Curry', 'गोअन वेज करी', [0, 1, 3])],
    recipe: {
      en: 'Goan Coconut Veg Curry', hi: 'गोअन नारियल वेज करी', time: '40 min', serves: '4',
      ingredients: ['1 cup grated coconut', '5 Kashmiri chillies, 1 tsp coriander seeds, ½ tsp cumin, 4 peppercorns', '4 garlic cloves, small ball of tamarind', '1 onion, 2 cups mixed vegetables', 'Turmeric, salt, oil'],
      steps: ['Dry-roast the chillies and whole spices for 1 minute.', 'Grind coconut, roasted spices, garlic, tamarind and turmeric to a smooth paste with water.', 'Sauté onion in oil until soft.', 'Add vegetables and a splash of water; cook covered until nearly done.', 'Stir in the coconut paste, salt and water to the consistency you like.', 'Simmer gently 8 minutes — don’t boil hard. Serve with rice.'],
      tip: { en: 'Dadi says: coconut curries split if boiled too hard — keep it at a gentle simmer.', hi: 'दादी कहती हैं: नारियल करी तेज़ उबालने से फट जाती है — धीमी आंच पर पकाओ।' },
    },
  },
  {
    id: 'kerala', en: 'Kerala', hi: 'केरल', tint: ['#80ed99', '#2d6a4f'], motif: 'boat',
    blurb: { en: 'Backwaters & sadya feasts', hi: 'बैकवॉटर और सद्या की दावत' },
    dishes: [d('Appam & Stew', 'अप्पम और स्टू', [4, 2]), d('Banana Chips', 'केले के चिप्स', [1, 0]), d('Kadala Curry', 'कडला करी', [3, 0]), d('Sulaimani Chai', 'सुलेमानी चाय', [5, 1]), d('Avial', 'अवियल', [2, 1, 4])],
    recipe: {
      en: 'Avial', hi: 'अवियल', time: '35 min', serves: '4',
      ingredients: ['3 cups vegetables cut in batons (raw banana, yam, carrot, beans, drumstick)', '1 cup grated coconut, 2 green chillies, 1 tsp cumin', '½ cup thick curd, whisked', 'Turmeric, salt', '1 tbsp coconut oil, a sprig of curry leaves'],
      steps: ['Cook vegetables with turmeric, salt and a little water until just tender.', 'Coarsely grind coconut, green chillies and cumin (no water or very little).', 'Add the coconut mix to the vegetables; cook 3–4 minutes.', 'Turn off the heat and fold in the curd.', 'Drizzle raw coconut oil and crush curry leaves over the top.', 'Cover for 5 minutes so the aroma soaks in. Serve with rice.'],
      tip: { en: 'Dadi says: add curd only after switching off the flame, so it stays smooth.', hi: 'दादी कहती हैं: दही आंच बंद करके ही डालो, तभी अवियल मुलायम रहेगा।' },
    },
  },
];

export const LEVELS_PER_CITY = 6;
export const TOTAL_LEVELS = CITIES.length * LEVELS_PER_CITY;

export const GUESTS = [
  { en: 'Dadi', hi: 'दादी' }, { en: 'Priya didi', hi: 'प्रिया दीदी' }, { en: 'Meena aunty', hi: 'मीना आंटी' },
  { en: 'Ananya', hi: 'अनन्या' }, { en: 'Fatima ji', hi: 'फ़ातिमा जी' }, { en: 'Lakshmi amma', hi: 'लक्ष्मी अम्मा' },
  { en: 'Simran', hi: 'सिमरन' }, { en: 'Rekha bua', hi: 'रेखा बुआ' }, { en: 'the kids', hi: 'बच्चे' }, { en: 'Office friends', hi: 'ऑफ़िस की सहेलियां' },
];

// Mechanics are revealed gradually so every few levels bring something new to discover.
export const INTRODUCTIONS = {
  1: 'basics', 3: 'rowpin', 4: 'tadka', 5: 'cooker', 7: 'dough', 10: 'dabba', 13: 'lock', 16: 'sixth',
};
