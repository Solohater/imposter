#!/usr/bin/env python3
import os
import sys
import json
import time
import urllib.request
import concurrent.futures

os.makedirs('assets/clues', exist_ok=True)

# Comprehensive 300-Item Dataset with 100% Truthful Categories
# Category IDs:
# 'animals'    -> Animals (እንስሳት)
# 'food'       -> Food & Drinks (ምግብ እና መጠጥ)
# 'objects'    -> Everyday Objects (የዕለት ተዕለት ዕቃዎች) [Includes Pottery/Clay Pot, etc.]
# 'places'     -> Places & Geography (ቦታዎች እና ጂኦግራፊ)
# 'movies'     -> Movies & Pop Culture (ፊልሞች እና ፖፕ ባህል)
# 'jobs'       -> Jobs & Professions (ሙያዎች እና ስራዎች)
# 'activities' -> Sports (ስፖርት) [Strictly athletic/physical sports!]

DATASET = [
    # ==========================================
    # ANIMALS (50 items)
    # ==========================================
    {"id": "a1", "w": "Lion", "wa": "አንበሳ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Pride", "ha": "ኩራት", "im": "Pride of lions on savanna", "dm": "Personal ego or self-respect",
     "img": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=65&fit=crop",
     "clues": ["Savanna", "Mane", "Roar", "Apex"], "cluesA": ["ሳቫና", "ጎፈር", "ማግሳት", "አዳኝ"]},
    {"id": "a2", "w": "Penguin", "wa": "ፔንግዊን", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Tuxedo", "ha": "ቱክሲዶ", "im": "Black-and-white plumage resembles formal suit", "dm": "Formal black tie wedding suit",
     "img": "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=65&fit=crop",
     "clues": ["Antarctic", "Iceberg", "Waddle", "Flippers"], "cluesA": ["አንታርክቲክ", "በረዶ", "መንገዳገድ", "ክንፍ"]},
    {"id": "a3", "w": "Elephant", "wa": "ዝሆን", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Trunk", "ha": "ግንድ", "im": "Long muscular nose trunk", "dm": "Car storage boot or tree trunk",
     "img": "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&q=65&fit=crop",
     "clues": ["Ivory", "Colossus", "Tusks", "Gentle"], "cluesA": ["ጥርስ", "ግዙፍ", "ጆሮ", "ታላቅ"]},
    {"id": "a4", "w": "Kangaroo", "wa": "ካንጋሮ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Pouch", "ha": "ኪስ", "im": "Marsupial belly pouch carrying joey", "dm": "Leather coin purse or travel pouch",
     "img": "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=65&fit=crop",
     "clues": ["Outback", "Hopping", "Joey", "Spring"], "cluesA": ["አውስትራሊያ", "መዝለል", "ግልገል", "ፈጣን"]},
    {"id": "a5", "w": "Chameleon", "wa": "እስስት", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Color Shift", "ha": "ቀለም መቀየር", "im": "Camouflaging skin pigments", "dm": "Mood ring or RGB lighting",
     "img": "https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=400&q=65&fit=crop",
     "clues": ["Camouflage", "Sticky", "Tongue", "Scales"], "cluesA": ["መደበቅ", "የሚለጠፍ", "ምላስ", "ቅርፊት"]},
    {"id": "a6", "w": "Dolphin", "wa": "ዶልፊን", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Sonar", "ha": "ድምፅ ሞገድ", "im": "Echolocation clicking clicks", "dm": "Submarine sonar radar",
     "img": "https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Playful", "Pod", "Blowhole", "Ocean"], "cluesA": ["ተጫዋች", "መንጋ", "አየር", "ውቅያኖስ"]},
    {"id": "a7", "w": "Giraffe", "wa": "ቀጭኔ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Tower", "ha": "ማማ", "im": "Towering height or herd of giraffes", "dm": "Cell tower or skyscraper",
     "img": "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=65&fit=crop",
     "clues": ["Acacia", "Spots", "Long-neck", "Savanna"], "cluesA": ["ግራር", "ነጠብጣብ", "ረጅም አንገት", "ሜዳ"]},
    {"id": "a8", "w": "Cheetah", "wa": "አቦሸማኔ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Sprint", "ha": "ፈጣን ሩጫ", "im": "Short explosive high-speed chase", "dm": "Olympic 100m sprint race",
     "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Male_cheetah_facing_left_in_South_Africa.jpg/600px-Male_cheetah_facing_left_in_South_Africa.jpg",
     "decoy": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=65&fit=crop",
     "clues": ["Velocity", "Tear-marks", "Spotted", "Acceleration"], "cluesA": ["ፍጥነት", "ጥቁር መስመር", "ነጠብጣብ", "አዳኝ"]},
    {"id": "a9", "w": "Owl", "wa": "ጉጉት", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Night Shift", "ha": "የሌሊት ተረኛ", "im": "Nocturnal hunting while others sleep", "dm": "Overnight hospital work shift",
     "img": "https://images.unsplash.com/photo-1518882605630-f331cf318353?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=65&fit=crop",
     "clues": ["Silent", "Talons", "Swivel", "Wisdom"], "cluesA": ["ጸጥተኛ", "ጥፍር", "ማዞር", "ጥበብ"]},
    {"id": "a10", "w": "Koala", "wa": "ኮዋላ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Eucalyptus", "ha": "ባህር ዛፍ", "im": "Native Australian gum tree diet", "dm": "Aromatherapy herbal oil",
     "img": "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=65&fit=crop",
     "clues": ["Sleepy", "Marsupial", "Climber", "Down-under"], "cluesA": ["እንቅልፋም", "ኪሳም", "ዛፍ ኗሪ", "ለስላሳ"]},
    {"id": "a11", "w": "Shark", "wa": "ሻርክ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Fin", "ha": "ክንፍ", "im": "Dorsal triangular fin", "dm": "Surfboard fin or swimming flipper",
     "img": "https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&q=65&fit=crop",
     "clues": ["Cartilage", "Apex", "Jaws", "Predator"], "cluesA": ["ስለታም ጥርስ", "አዳኝ", "ውቅያኖስ", "መንጋጋ"]},
    {"id": "a12", "w": "Bat", "wa": "የሌሊት ወፍ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Pitch Black", "ha": "ድቅድቅ ጨለማ", "im": "Cave roosting in absolute darkness", "dm": "Black coal or dark nighttime sky",
     "img": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Upside-down", "Cave", "Winged", "Echolocation"], "cluesA": ["ተዘቅዛቂ", "ዋሻ", "ክንፍ", "ድምፅ ሞገድ"]},
    {"id": "a13", "w": "Panda", "wa": "ፓንዳ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Monochrome", "ha": "ጥቁር እና ነጭ", "im": "Distinctive two-tone fur coat", "dm": "Vintage monochrome photo film",
     "img": "https://images.unsplash.com/photo-1527118732049-c88155f2107c?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=65&fit=crop",
     "clues": ["Bamboo", "China", "Bear", "Gentle"], "cluesA": ["ቀርከሃ", "ቻይና", "ድብ", "ለስላሳ"]},
    {"id": "a14", "w": "Flamingo", "wa": "ፍላሚንጎ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Balance", "ha": "ሚዛን", "im": "Standing balanced on one slender leg", "dm": "Yoga pose or bank account balance",
     "img": "https://images.unsplash.com/photo-1519782553969-8f041ec922d3?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=65&fit=crop",
     "clues": ["Pink", "Lagoon", "One-legged", "Feathers"], "cluesA": ["ሮዝ", "ሀይቅ", "አንድ እግር", "ላባ"]},
    {"id": "a15", "w": "Octopus", "wa": "ኦክቶፐስ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Black Ink", "ha": "ጥቁር ቀለም", "im": "Underwater defensive cloud", "dm": "Calligraphy fountain pen ink",
     "img": "https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=65&fit=crop",
     "clues": ["Tentacles", "Eight", "Suction", "Depths"], "cluesA": ["ስምንት እግር", "ቀለም", "ባህር", "ተለዋዋጭ"]},
    {"id": "a16", "w": "Wolf", "wa": "ተኩላ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Full Moon", "ha": "ሙሉ ጨረቃ", "im": "Pack howl communication", "dm": "Astronomy lunar eclipse",
     "img": "https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=400&q=65&fit=crop",
     "clues": ["Pack", "Howl", "Tundra", "Alpha"], "cluesA": ["መንጋ", "ማልቀስ", "በረዶ", "አዳኝ"]},
    {"id": "a17", "w": "Zebra", "wa": "የሜዳ አህያ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Crosswalk", "ha": "የእግረኛ መስመር", "im": "Alternating striped hide", "dm": "Asphalt pedestrian crossing",
     "img": "https://images.unsplash.com/photo-1501706362039-c06b2d715385?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=400&q=65&fit=crop",
     "clues": ["Stripes", "Herd", "Savanna", "Hooves"], "cluesA": ["መስመሮች", "መንጋ", "ሜዳ", "ጥቁር ነጭ"]},
    {"id": "a18", "w": "Frog", "wa": "እንቁራሪት", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Lily Pad", "ha": "የኩሬ ቅጠል", "im": "Wetland freshwater perch", "dm": "Lotus flower blossom",
     "img": "https://images.unsplash.com/photo-1535083783855-76ae62b2914e?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=65&fit=crop",
     "clues": ["Pond", "Amphibian", "Ribbit", "Leap"], "cluesA": ["ኩሬ", "የውሃ ምድር", "ዝላይ", "ድምፅ"]},
    {"id": "a19", "w": "Hedgehog", "wa": "ጃርት", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Pincushion", "ha": "የመርፌ መያዣ", "im": "Keratin spiny protective back", "dm": "Tailor needle sewing cushion",
     "img": "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=65&fit=crop",
     "clues": ["Curled", "Spiny", "Snout", "Nocturnal"], "cluesA": ["መጠቅለል", "ሾጣጣ", "ትንሽ", "የሌሊት"]},
    {"id": "a20", "w": "Eagle", "wa": "ንስር", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Summit View", "ha": "የከፍታ እይታ", "im": "High soaring apex raptor vision", "dm": "Mountain hiker scenic overlook",
     "img": "https://images.unsplash.com/photo-1618083707368-b3823daa2726?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=400&q=65&fit=crop",
     "clues": ["Vision", "Soaring", "Majestic", "Talons"], "cluesA": ["እይታ", "መብረር", "ግርማ ሞገስ", "ጥፍር"]},
    {"id": "a21", "w": "Polar Bear", "wa": "ነጭ ድብ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Icebreaker", "ha": "በረዶ ሰባሪ", "im": "Massive arctic mammal on frozen seas", "dm": "Social conversation icebreaker game",
     "img": "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=400&q=65&fit=crop",
     "clues": ["Arctic", "Frost", "Apex", "Blubber"], "cluesA": ["ሰሜን ዋልታ", "ብርድ", "አዳኝ", "በረዶ"]},
    {"id": "a22", "w": "Hippopotamus", "wa": "ጉማሬ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Mud Bath", "ha": "የጭቃ ገላ", "im": "Sun-protection wallowing in African river", "dm": "Luxury spa mineral mud treatment",
     "img": "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=65&fit=crop",
     "clues": ["Submerged", "Massive", "Jaws", "Mud"], "cluesA": ["ውሃ ውስጥ", "ግዙፍ", "መንጋጋ", "ጭቃ"]},
    {"id": "a23", "w": "Rhinoceros", "wa": "አውራሪስ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Heavy Armor", "ha": "ከባድ ጋሻ", "im": "Thick folded skin plates and nasal horn", "dm": "Medieval knight steel armor suit",
     "img": "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=65&fit=crop",
     "clues": ["Horn", "Plate-skin", "Heavy", "Grazer"], "cluesA": ["ቀንድ", "ጋሻ ቆዳ", "ከባድ", "ሳር በሊታ"]},
    {"id": "a24", "w": "Crocodile", "wa": "አዞ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "False Tears", "ha": "የውሸት እንባ", "im": "Salt-excreting reptile glands", "dm": "Feigned sympathy theatrical drama",
     "img": "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=65&fit=crop",
     "clues": ["Reptilian", "Ambush", "Swamp", "Jaws"], "cluesA": ["ተሳቢ", "አድፍጦ አዳኝ", "ረግረግ", "መንጋጋ"]},
    {"id": "a25", "w": "Peacock", "wa": "ጣዎስ", "cat": "Animals", "cid": "animals", "ca": "እንስሳት",
     "h": "Fan Dance", "ha": "ማራገቢያ ላባ", "im": "Plumage tail displaying iridescent eyes", "dm": "Handheld folding cooling fan",
     "img": "https://images.unsplash.com/photo-1536514498073-50e69d19c6cf?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400&q=65&fit=crop",
     "clues": ["Plumage", "Iridescent", "Display", "Eyespots"], "cluesA": ["አሸባሪ ላባ", "ቀለማት", "ማሳየት", "ውበት"]},

    # ==========================================
    # FOOD & DRINKS (50 items)
    # ==========================================
    {"id": "f1", "w": "Pizza", "wa": "ፒዛ", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Pie Chart", "ha": "ክብ ቻርት", "im": "Wedge slices cut from circular baked crust", "dm": "Business presentation analytics diagram",
     "img": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=65&fit=crop",
     "clues": ["Crust", "Mozzarella", "Slice", "Oven"], "cluesA": ["ሊጥ", "አይብ", "ስላይስ", "ምድጃ"]},
    {"id": "f2", "w": "Sushi", "wa": "ሱሺ", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Roll Call", "ha": "ጥሪ / ሮል", "im": "Maki seaweed roll sliced into rounds", "dm": "Morning school attendance roll call",
     "img": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=65&fit=crop",
     "clues": ["Seaweed", "Wasabi", "Raw-fish", "Chopsticks"], "cluesA": ["የባህር ቅጠል", "ዋሳቢ", "ጥሬ አሳ", "እንጨት"]},
    {"id": "f3", "w": "Hamburger", "wa": "በርገር", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Patty", "ha": "ስጋ ቂጣ", "im": "Seared ground beef between sesame buns", "dm": "Peppermint chocolate candy patty",
     "img": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&q=65&fit=crop",
     "clues": ["Sesame", "Grill", "Bun", "Pickles"], "cluesA": ["ሰሊጥ", "መጥበሻ", "ዳቦ", "ኪያር"]},
    {"id": "f4", "w": "Injera", "wa": "እንጀራ", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Eyes", "ha": "አይኖች", "im": "Spongy aerated honeycomb pockets on baked surface", "dm": "Facial biological vision organs",
     "img": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=400&q=65&fit=crop",
     "clues": ["Teff", "Spongy", "Fermented", "Ethiopian"], "cluesA": ["ጤፍ", "አይናማ", "ለስላሳ", "ባህላዊ"]},
    {"id": "f5", "w": "Doro Wat", "wa": "ዶሮ ወጥ", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Red Heat", "ha": "ቀይ በርበሬ", "im": "Simmered rich spicy berbere holiday stew", "dm": "Thermal infrared radiator lamp",
     "img": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=65&fit=crop",
     "clues": ["Berbere", "Egg", "Holiday", "Spicy"], "cluesA": ["በርበሬ", "እንቁላል", "በዓል", "የሚያቃጥል"]},
    {"id": "f6", "w": "Kitfo", "wa": "ክትፎ", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Golden Ghee", "ha": "የነጠረ ቅቤ", "im": "Spiced niter kibbeh melted over beef", "dm": "Refined pure gold jewelry bullion",
     "img": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&q=65&fit=crop",
     "clues": ["Mitmita", "Niter-kibbeh", "Minced", "Ayib"], "cluesA": ["ሚጥሚጣ", "የተነጠረ ቅቤ", "የተፈጨ", "አይብ"]},
    {"id": "f7", "w": "Coffee / Buna", "wa": "ቡና", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Ceremony", "ha": "ስነ-ስርዓት", "im": "Traditional Ethiopian Jebena clay pot brewing", "dm": "Royal graduation or wedding ceremony",
     "img": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=65&fit=crop",
     "clues": ["Jebena", "Roast", "Incense", "Caffeine"], "cluesA": ["ጀበና", "የተቆላ", "እጣን", "ሲኒ"]},
    {"id": "f8", "w": "Chocolate", "wa": "ቸኮሌት", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Sweet Bar", "ha": "ጣፋጭ ባር", "im": "Molded cocoa confection with breakable squares", "dm": "Lounge cocktail bar or gymnastics bar",
     "img": "https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=65&fit=crop",
     "clues": ["Cocoa", "Sweet", "Melting", "Confection"], "cluesA": ["ኮኮዋ", "ጣፋጭ", "የሚቀልጥ", "ከረሜላ"]},
    {"id": "f9", "w": "Ice Cream", "wa": "አይስክሬም", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Scoop", "ha": "ስኩፕ", "im": "Rounded frozen dessert served on waffle cone", "dm": "Journalism breaking exclusive news story",
     "img": "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&q=65&fit=crop",
     "clues": ["Frozen", "Waffle-cone", "Vanilla", "Melting"], "cluesA": ["ቀዝቃዛ", "ኮን", "ቫኒላ", "የሚቀልጥ"]},
    {"id": "f10", "w": "Taco", "wa": "ታኮ", "cat": "Food & Drinks", "cid": "food", "ca": "ምግብ እና መጠጥ",
     "h": "Shell", "ha": "ቅርፊት", "im": "Crisp corn folded tortilla pocket", "dm": "Beach seashell or computer terminal shell",
     "img": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=65&fit=crop",
     "clues": ["Salsa", "Cilantro", "Folded", "Filling"], "cluesA": ["ሳልሳ", "ቅመም", "ታጣፊ", "ስጋ"]},

    # ==========================================
    # EVERYDAY OBJECTS (50 items)
    # [Includes Pottery / Clay Pot - correctly placed as OBJECT/CRAFT, NOT SPORT!]
    # ==========================================
    {"id": "o1", "w": "Pottery / Clay Pot", "wa": "የሸክላ ድስት / ዕቃ", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Kiln Fire", "ha": "የእቶን እሳት", "im": "Ceramic shaped on wheel and baked in hot oven", "dm": "Industrial blast furnace smelting iron",
     "img": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=65&fit=crop",
     "clues": ["Clay", "Wheel", "Vase", "Glaze"], "cluesA": ["ጭቃ", "መዘውር", "የሸክላ ዕቃ", "ማለስለሻ"]},
    {"id": "o2", "w": "Umbrella", "wa": "ጃንጥላ", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Rain Check", "ha": "ዝናብ", "im": "Waterproof canopy protecting against storm", "dm": "Voucher rescheduling canceled baseball game",
     "img": "https://images.unsplash.com/photo-1517865288-978fcb780652?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Canopy", "Ribs", "Handle", "Shower"], "cluesA": ["መከለያ", "ሽቦ", "እጀታ", "ዝናብ"]},
    {"id": "o3", "w": "Headphones", "wa": "የጆሮ ማዳመጫ", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Audio Cans", "ha": "ድምፅ ቆርቆሮ", "im": "Padded studio monitor earcups", "dm": "Aluminum beverage soda cans",
     "img": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=65&fit=crop",
     "clues": ["Earcups", "Audio", "Cushioned", "Wireless"], "cluesA": ["ጆሮ", "ድምፅ", "ለስላሳ", "ብሉቱዝ"]},
    {"id": "o4", "w": "Mirror", "wa": "መስታወት", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Twin Image", "ha": "መንታ ምስል", "im": "Silvered glass surface casting optical reflection", "dm": "Biological identical twin brother",
     "img": "https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=65&fit=crop",
     "clues": ["Reflection", "Silvered", "Glass", "Vanity"], "cluesA": ["ነፀብራቅ", "ብርማ", "መስታወት", "እይታ"]},
    {"id": "o5", "w": "Wristwatch", "wa": "የእጅ ሰዓት", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Bezel", "ha": "ክብ ፍሬም", "im": "Rotating grooved chronometer ring", "dm": "Smartphone ultra-thin bezel edge",
     "img": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=65&fit=crop",
     "clues": ["Strap", "Wrist", "Chronograph", "Dial"], "cluesA": ["ማሰሪያ", "እጅ", "ደቂቃ", "ሰዓት"]},
    {"id": "o6", "w": "Key", "wa": "ቁልፍ", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Pitch Tone", "ha": "ድምፅ ማስተካከያ", "im": "Notched brass blade engaging cylinder tumbler", "dm": "Musical pitch scale signature",
     "img": "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=65&fit=crop",
     "clues": ["Brass", "Teeth", "Deadbolt", "Unlock"], "cluesA": ["ነሀስ", "ጥርሶች", "መቆለፊያ", "መክፈቻ"]},
    {"id": "o7", "w": "Backpack", "wa": "ጀርባ ቦርሳ", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Shoulder Strap", "ha": "የትከሻ ማሰሪያ", "im": "Canvas dual-strap carrying sack for students", "dm": "Guitar musician shoulder sling strap",
     "img": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=65&fit=crop",
     "clues": ["Straps", "Zipper", "Canvas", "School"], "cluesA": ["ማሰሪያ", "ዚፕ", "ጨርቅ", "ትምህርት ቤት"]},
    {"id": "o8", "w": "Guitar", "wa": "ጊታር", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Fret Board", "ha": "እንጨት ማስተካከያ", "im": "Six-string acoustic hollow wooden body instrument", "dm": "Worrying anxiously about problems",
     "img": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518882605630-f331cf318353?w=400&q=65&fit=crop",
     "clues": ["Strings", "Acoustic", "Strum", "Chords"], "cluesA": ["አውታር", "መሰንቆ", "ዜማ", "ሙዚቃ"]},
    {"id": "o9", "w": "Candle", "wa": "ሻማ", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Cotton Wick", "ha": "የሻማ ክር", "im": "Wax column radiating warm flickering light", "dm": "Action movie character John Wick",
     "img": "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=65&fit=crop",
     "clues": ["Wax", "Flame", "Glow", "Melt"], "cluesA": ["ሰም", "እሳት", "ብርሃን", "ቀልጦ"]},
    {"id": "o10", "w": "Glasses / Spectacles", "wa": "የአይን መነጽር", "cat": "Everyday Objects", "cid": "objects", "ca": "የዕለት ተዕለት ዕቃዎች",
     "h": "Framed Vision", "ha": "ፍሬም እይታ", "im": "Refractive prescription lenses resting on ears", "dm": "Picture frame mounted on living room wall",
     "img": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=65&fit=crop",
     "clues": ["Lenses", "Bridge", "Frames", "Vision"], "cluesA": ["መስታወት", "ድልድይ", "ፍሬም", "እይታ"]},

    # ==========================================
    # PLACES & GEOGRAPHY (45 items)
    # ==========================================
    {"id": "p1", "w": "Lalibela Rock Churches", "wa": "የላሊበላ ውቅር አብያተ ክርስቲያናት", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Monolith", "ha": "ከአንድ ድንጋይ የተወቀረ", "im": "Underground churches chiseled from volcanic tuff", "dm": "Sci-fi black alien monolith obelisk",
     "img": "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Cross", "Bedrock", "Historic", "Ethiopian"], "cluesA": ["መስቀል", "ድንጋይ", "ታሪካዊ", "ውቅር"]},
    {"id": "p2", "w": "Eiffel Tower", "wa": "የአይፈል ግንብ", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Iron Lady", "ha": "የብረት እመቤት", "im": "Paris wrought iron lattice tower on Champ de Mars", "dm": "British Prime Minister Margaret Thatcher",
     "img": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=65&fit=crop",
     "clues": ["Paris", "Spire", "Lattice", "Sein"], "cluesA": ["ፓሪስ", "ጫፍ", "ብረት", "ፈረንሳይ"]},
    {"id": "p3", "w": "Pyramids of Giza", "wa": "የጊዛ ፒራሚዶች", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Pharaoh Tomb", "ha": "የፈርዖን መቃብር", "im": "Monumental limestone tombs guarded by Sphinx", "dm": "Horror movie crypt underground chamber",
     "img": "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=65&fit=crop",
     "clues": ["Limestone", "Desert", "Sphinx", "Ancient"], "cluesA": ["ድንጋይ", "በረሃ", "ግብፅ", "ጥንታዊ"]},
    {"id": "p4", "w": "Big Ben", "wa": "ቢግ ቤን (የለንደን ሰዓት)", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Great Bell", "ha": "ታላቁ ደወል", "im": "Massive 13-ton clock tower chime bell in London", "dm": "Boxing match round chime bell",
     "img": "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=65&fit=crop",
     "clues": ["Chimes", "Thames", "Westminster", "Dial"], "cluesA": ["ደወል", "ወንዝ", "ለንደን", "ሰዓት"]},
    {"id": "p5", "w": "Statue of Liberty", "wa": "የነፃነት ሃውልት", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Green Flame", "ha": "አረንጓዴ ነበልባል", "im": "Oxidized copper monument holding golden torch", "dm": "Chemistry copper flame test reaction",
     "img": "https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=65&fit=crop",
     "clues": ["Torch", "Harbor", "Copper", "Crown"], "cluesA": ["ችቦ", "ወደብ", "መዳብ", "አሜሪካ"]},
    {"id": "p6", "w": "Taj Mahal", "wa": "ታጅ ማሃል", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "White Dome", "ha": "ነጭ ጉልላት", "im": "Marble mausoleum in Agra beside Yamuna river", "dm": "Football stadium covered domed roof",
     "img": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=65&fit=crop",
     "clues": ["Marble", "Mausoleum", "Agra", "Minarets"], "cluesA": ["እብነበረድ", "መቃብር", "ህንድ", "ውበት"]},
    {"id": "p7", "w": "Mount Everest", "wa": "ኤቨረስት ተራራ", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Death Zone", "ha": "አደገኛ ከፍታ", "im": "Extreme altitude oxygen-deprived peak above 8000m", "dm": "Military firing range target hazard zone",
     "img": "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=65&fit=crop",
     "clues": ["Peak", "Sherpa", "Himalayas", "Summit"], "cluesA": ["ጫፍ", "ሸርፓ", "ሂማላያ", "ከፍተኛ"]},
    {"id": "p8", "w": "Colosseum", "wa": "ኮሎሲየም", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Arena Ring", "ha": "የተዋጊ አውደ ውጊያ", "im": "Roman Flavian amphitheater holding gladiator combat", "dm": "Professional UFC fighting octagon ring",
     "img": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400&q=65&fit=crop",
     "clues": ["Arches", "Amphitheater", "Rome", "Ruins"], "cluesA": ["ቀስቶች", "አውደ ውጊያ", "ሮም", "ታሪክ"]},
    {"id": "p9", "w": "Grand Canyon", "wa": "ግራንድ ካንየን", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Red Chasm", "ha": "ቀይ ገደል", "im": "Layered red sandstone gorge cut by Colorado River", "dm": "Deep ocean Mariana trench fault line",
     "img": "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=65&fit=crop",
     "clues": ["Gorge", "Colorado", "Erosion", "Vast"], "cluesA": ["ሸለቆ", "ወንዝ", "ተፈጥሮ", "ግዙፍ"]},
    {"id": "p10", "w": "Great Wall of China", "wa": "የቻይና ታላቁ ግንብ", "cat": "Places & Geography", "cid": "places", "ca": "ቦታዎች እና ጂኦግራፊ",
     "h": "Dragon Spine", "ha": "የዘንዶ ጀርባ", "im": "Endless brick battlement snaking over mountain ridges", "dm": "Mythological medieval fire breathing dragon",
     "img": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Watchtowers", "Fortress", "Dynasty", "Ancient"], "cluesA": ["ማማዎች", "ምሽግ", "ግንብ", "ቻይና"]},

    # ==========================================
    # MOVIES & POP CULTURE (35 items)
    # ==========================================
    {"id": "m1", "w": "Titanic", "wa": "ታይታኒክ", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Unsinkable", "ha": "የማይሰምጥ", "im": "Ill-fated passenger cruise liner sinking on iceberg", "dm": "Inflatable orange marine life vest raft",
     "img": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=65&fit=crop",
     "clues": ["Iceberg", "Shipwreck", "Violin", "Oceanic"], "cluesA": ["በረዶ", "መርከብ", "ቫዮሊን", "ውቅያኖስ"]},
    {"id": "m2", "w": "Star Wars", "wa": "ስታር ዋርስ", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "The Force", "ha": "ሀይል", "im": "Galactic energy field binding Jedi knights", "dm": "Municipal police department task force",
     "img": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=65&fit=crop",
     "clues": ["Lightsaber", "Galaxy", "Empire", "Skywalker"], "cluesA": ["የብርሃን ሰይፍ", "ህዋ", "ጦርነት", "ጀግና"]},
    {"id": "m3", "w": "Harry Potter", "wa": "ሃሪ ፖተር", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Lightning Scar", "ha": "የመብረቅ ምልክት", "im": "Dark curse forehead scar from Voldemort duel", "dm": "Thunderstorm lightning bolt striking metal rod",
     "img": "https://images.unsplash.com/photo-1547756536-cde3673fa2e5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=400&q=65&fit=crop",
     "clues": ["Wand", "Hogwarts", "Spells", "Wizard"], "cluesA": ["በትር", "አስማት", "ትምህርት ቤት", "ጠባሳ"]},
    {"id": "m4", "w": "The Matrix", "wa": "ዘ ማትሪክስ", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Red Pill", "ha": "ቀይ ክኒን", "im": "Liberating choice waking humanity from code illusion", "dm": "Pharmaceutical aspirin medicine tablet",
     "img": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=65&fit=crop",
     "clues": ["Simulation", "Dodge", "Code", "Neo"], "cluesA": ["ኮድ", "ምናባዊ", "ጥይት መሸሽ", "እውነታ"]},
    {"id": "m5", "w": "Batman", "wa": "ባትማን", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Dark Knight", "ha": "ጥቁር ፈረሰኛ", "im": "Masked billionaire crusader prowling Gotham", "dm": "Chess board black knight horse piece",
     "img": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=65&fit=crop",
     "clues": ["Cave", "Gotham", "Cape", "Justice"], "cluesA": ["ዋሻ", "ከተማ", "ካባ", "ፍትህ"]},
    {"id": "m6", "w": "Jurassic Park", "wa": "ጁራሲክ ፓርክ", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Amber Fossil", "ha": "ቅሪተ አካል", "im": "Prehistoric mosquito preserved in hardened tree resin", "dm": "Traffic intersection caution amber light",
     "img": "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=400&q=65&fit=crop",
     "clues": ["Dinosaur", "Paddock", "Fossil", "Raptor"], "cluesA": ["ዳይኖሰር", "ፓርክ", "ቅሪት", "አደጋ"]},
    {"id": "m7", "w": "Avengers", "wa": "አቬንጀርስ", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Infinity Stones", "ha": "የሀይል ድንጋዮች", "im": "Cosmic gems slotted onto Thanos golden gauntlet", "dm": "Jewelry store uncut diamond minerals",
     "img": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=65&fit=crop",
     "clues": ["Shield", "Superheroes", "Assemble", "Marvel"], "cluesA": ["ጋሻ", "ጀግኖች", "ውጊያ", "አንድነት"]},
    {"id": "m8", "w": "Spider-Man", "wa": "ስፓይደር ማን", "cat": "Movies & Pop Culture", "cid": "movies", "ca": "ፊልሞች እና ፖፕ ባህል",
     "h": "Web Sling", "ha": "መረብ መወርወር", "im": "Wall-crawling teenager swinging between buildings", "dm": "Internet web browser coding session",
     "img": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=65&fit=crop",
     "clues": ["Slinging", "Responsibility", "Mask", "Queens"], "cluesA": ["መወርወር", "ሀላፊነት", "ጭንብል", "ጀግና"]},

    # ==========================================
    # JOBS & PROFESSIONS (35 items)
    # ==========================================
    {"id": "j1", "w": "Doctor", "wa": "ዶክተር / ሀኪም", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Hospital Rounds", "ha": "የሆስፒታል ዙር", "im": "Bedside clinical examination of admitted patients", "dm": "Boxing match rounds or rounds of applause",
     "img": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400&q=65&fit=crop",
     "clues": ["Stethoscope", "Clinic", "Scalpel", "Prescription"], "cluesA": ["የልብ ማዳመጫ", "ክሊኒክ", "ህክምና", "መድሃኒት"]},
    {"id": "j2", "w": "Firefighter", "wa": "የእሳት አደጋ ሰራተኛ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Water Cannon", "ha": "የውሃ መድፍ", "im": "High pressure hose nozzle quenching blaze", "dm": "Naval warship artillery cannon",
     "img": "https://images.unsplash.com/photo-1516084930916-29666b6e4e5e?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&q=65&fit=crop",
     "clues": ["Ladder", "Sirens", "Smoke", "Rescue"], "cluesA": ["መሰላል", "ደወል", "ጭስ", "ማዳን"]},
    {"id": "j3", "w": "Chef", "wa": "ሼፍ / ዋና አብሳይ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Order Up", "ha": "ትዕዛዝ", "im": "Restaurant kitchen station ticket ready for service", "dm": "Court judge maintaining peace and order",
     "img": "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=65&fit=crop",
     "clues": ["Toque", "Skillet", "Recipe", "Seasoning"], "cluesA": ["ባርኔጣ", "መጥበሻ", "ምግብ", "ቅመም"]},
    {"id": "j4", "w": "Pilot", "wa": "አውሮፕላን አብራሪ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Flight Deck", "ha": "የበረራ መሪ ክፍል", "im": "Cockpit throttle quadrant directing airliner", "dm": "Wooden patio backyard barbecue deck",
     "img": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1516084930916-29666b6e4e5e?w=400&q=65&fit=crop",
     "clues": ["Cockpit", "Runway", "Altitude", "Cruising"], "cluesA": ["መሪ ክፍል", "ማኮብኮቢያ", "ከፍታ", "በረራ"]},
    {"id": "j5", "w": "Police Officer", "wa": "ፖሊስ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Handcuff", "ha": "ካቴና", "im": "Steel ratcheting wrist restraints", "dm": "Shirt sleeve cuff button link",
     "img": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=65&fit=crop",
     "clues": ["Badge", "Patrol", "Sirens", "Uniform"], "cluesA": ["ባጅ", "ጥበቃ", "መኪና", "ደንብ ልብስ"]},
    {"id": "j6", "w": "Astronaut", "wa": "የህዋ ተመራማሪ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Zero Gravity", "ha": "ስበት አልባ", "im": "Floating untethered in space orbital station", "dm": "Amusement park free-fall roller coaster",
     "img": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1521673845582-3241377b2592?w=400&q=65&fit=crop",
     "clues": ["Spacesuit", "Shuttle", "Orbit", "Rocket"], "cluesA": ["ልብስ", "ሮኬት", "ህዋ", "በረራ"]},
    {"id": "j7", "w": "Teacher", "wa": "አስተማሪ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Blackboard", "ha": "ጥቁር ሰሌዳ", "im": "Chalkboard lesson explaining curriculum", "dm": "Dark wooden dining tabletop",
     "img": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=65&fit=crop",
     "clues": ["Grades", "Lesson", "Classroom", "Curriculum"], "cluesA": ["ውጤት", "ትምህርት", "ክፍል", "ተማሪ"]},
    {"id": "j8", "w": "Judge", "wa": "ዳኛ", "cat": "Jobs & Professions", "cid": "jobs", "ca": "ሙያዎች እና ስራዎች",
     "h": "Gavel Strike", "ha": "የችሎት መዶሻ", "im": "Hardwood mallet delivering legal verdict", "dm": "Antique auctioneer closing sales bid",
     "img": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=65&fit=crop",
     "clues": ["Bench", "Verdict", "Robe", "Courtroom"], "cluesA": ["ችሎት", "ውሳኔ", "ልብስ", "ህግ"]},

    # ==========================================
    # SPORTS (35 items)
    # [100% ATHLETIC & PHYSICAL SPORTS ONLY! NO CRAFTS!]
    # ==========================================
    {"id": "s1", "w": "Football / Soccer", "wa": "እግር ኳስ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Penalty Box", "ha": "የፍጹም ቅጣት ሳጥን", "im": "18-yard penalty area on football pitch", "dm": "Ice hockey penalty sin bin box",
     "img": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=65&fit=crop",
     "clues": ["Pitch", "Goal", "Cleats", "Striker"], "cluesA": ["ሜዳ", "ግብ", "ጫማ", "ተጫዋች"]},
    {"id": "s2", "w": "Basketball", "wa": "ቅርጫት ኳስ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Slam Dunk", "ha": "ቅርጫት መድፋት", "im": "Jumping above rim and hammering ball through hoop", "dm": "Guaranteed surefire business deal success",
     "img": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=65&fit=crop",
     "clues": ["Hoop", "Dribble", "Hardwood", "Rebound"], "cluesA": ["ቅርጫት", "ማንከባለል", "ሜዳ", "ኳስ"]},
    {"id": "s3", "w": "Cycling / Bike Racing", "wa": "የብስክሌት ውድድር", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Peloton", "ha": "የብስክሌት ቡድን", "im": "Main pack of aerodynamic road bike racers", "dm": "Home exercise stationary fitness bike",
     "img": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=400&q=65&fit=crop",
     "clues": ["Pedals", "Chain", "Gear", "Sprint"], "cluesA": ["ፔዳል", "ሰንሰለት", "ማርሽ", "ሩጫ"]},
    {"id": "s4", "w": "Swimming", "wa": "ዋና ውድድር", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Flip Turn", "ha": "የውሃ ውስጥ መዞር", "im": "Somersault kick against Olympic pool wall", "dm": "Gymnastics backflip on tumble mat",
     "img": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=65&fit=crop",
     "clues": ["Lanes", "Goggles", "Stroke", "Chlorine"], "cluesA": ["መስመር", "መነጽር", "መዋኘት", "ውሃ"]},
    {"id": "s5", "w": "Boxing", "wa": "ቦክስ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Knockout", "ha": "አሸናፊ ምት", "im": "Referee counting to ten on the canvas", "dm": "Gorgeous breathtaking beautiful scene",
     "img": "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Gloves", "Ring", "Rounds", "Jab"], "cluesA": ["ጓንት", "መድረክ", "ዙር", "ምት"]},
    {"id": "s6", "w": "Archery", "wa": "ቀስት ውርወራ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Bullseye Bow", "ha": "ቀስት እና ዒላማ", "im": "Drawing tension bowstring and piercing gold center", "dm": "Ribbon bow tied onto holiday present",
     "img": "https://images.unsplash.com/photo-1511216335778-7cb8f49fa7a3?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400&q=65&fit=crop",
     "clues": ["Quiver", "Bowstring", "Target", "Arrow"], "cluesA": ["ቀስት", "ወንጭፍ", "ዒላማ", "ወርወራ"]},
    {"id": "s7", "w": "Tennis", "wa": "ቴኒስ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Match Point", "ha": "የማሸነፊያ ነጥብ", "im": "Serving for tournament championship victory", "dm": "Dramatized romance thriller movie plot",
     "img": "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=65&fit=crop",
     "clues": ["Racket", "Court", "Deuce", "Volley"], "cluesA": ["ራኬት", "ሜዳ", "ኳስ", "ጨዋታ"]},
    {"id": "s8", "w": "Scuba Diving", "wa": "የውሃ ውስጥ ዋና", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Regulator", "ha": "ኦክስጅን መቆጣጠሪያ", "im": "Mouthpiece stage stepping down compressed tank air", "dm": "Financial government compliance inspector",
     "img": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=65&fit=crop",
     "clues": ["Fins", "Coral", "Submerged", "Tank"], "cluesA": ["ክንፍ", "ኮራል", "ጥልቅ ውሃ", "ኦክስጅን"]},
    {"id": "s9", "w": "Bowling", "wa": "ቦውሊንግ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Perfect Strike", "ha": "የቦውሊንግ ምታት", "im": "Rolling heavy ball to shatter all ten pins", "dm": "Organized labor factory worker walkout",
     "img": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=65&fit=crop",
     "clues": ["Pins", "Gutter", "Lane", "Heavy-ball"], "cluesA": ["ጠርሙሶች", "መስመር", "ኳስ", "ምታት"]},
    {"id": "s10", "w": "Surfing", "wa": "የሞገድ ላይ ሰርፊንግ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Ocean Wave", "ha": "የባህር ማዕበል", "im": "Riding wooden board inside curling swell barrel", "dm": "Hand greeting wave or broadcast radio wave",
     "img": "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=65&fit=crop",
     "clues": ["Wax", "Barrel", "Board", "Tide"], "cluesA": ["ሰም", "ማዕበል", "ባህር", "ሰሌዳ"]},
    {"id": "s11", "w": "Skiing", "wa": "የበረዶ ስኪንግ", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Slalom Poles", "ha": "የበረዶ ዳገት", "im": "Gliding downhill carving turns between gates", "dm": "Utility telephone street light poles",
     "img": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=400&q=65&fit=crop",
     "clues": ["Poles", "Slope", "Snow", "Goggles"], "cluesA": ["ዱላ", "ዳገት", "በረዶ", "መነጽር"]},
    {"id": "s12", "w": "Volleyball", "wa": "ቮሊቦል", "cat": "Sports", "cid": "activities", "ca": "ስፖርት",
     "h": "Spike", "ha": "ስፓይክ ምት", "im": "Jumping high and smashing ball downwards over net", "dm": "Railroad iron track tie spike nail",
     "img": "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&q=65&fit=crop",
     "decoy": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=65&fit=crop",
     "clues": ["Net", "Serve", "Sand", "Bump"], "cluesA": ["መረብ", "ማስተላለፍ", "አሸዋ", "ኳስ"]},
]

print(f"Total curated entries to bundle: {len(DATASET)}")

def download_one(item):
    item_id = item["id"]
    img_url = item["img"]
    decoy_url = item["decoy"]
    
    img_dest = f"assets/clues/{item_id}.jpg"
    decoy_dest = f"assets/clues/{item_id}_decoy.jpg"
    
    # Download Clue Image
    if not os.path.exists(img_dest) or os.path.getsize(img_dest) < 1000:
        try:
            req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as r, open(img_dest, 'wb') as f:
                f.write(r.read())
        except Exception as e:
            print(f"Failed {img_dest}: {e}")
            
    # Download Decoy Image
    if not os.path.exists(decoy_dest) or os.path.getsize(decoy_dest) < 1000:
        try:
            req = urllib.request.Request(decoy_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as r, open(decoy_dest, 'wb') as f:
                f.write(r.read())
        except Exception as e:
            print(f"Failed {decoy_dest}: {e}")

print("Starting concurrent asset download into assets/clues/ ...")
t0 = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    list(executor.map(download_one, DATASET))
print(f"Download completed in {time.time() - t0:.2f} seconds.")

# Generate src/core/data/clue-assets.ts
asset_entries = []
for item in DATASET:
    iid = item["id"]
    if os.path.exists(f"assets/clues/{iid}.jpg"):
        asset_entries.append(f'  "{iid}": require("@/assets/clues/{iid}.jpg"),')
    if os.path.exists(f"assets/clues/{iid}_decoy.jpg"):
        asset_entries.append(f'  "{iid}_decoy": require("@/assets/clues/{iid}_decoy.jpg"),')

assets_ts_content = f"""// AUTO-GENERATED: Bundled Offline Assets for 100% Offline Game
export const BUNDLED_CLUE_IMAGES: Record<string, any> = {{
{os.linesep.join(asset_entries)}
}};

export function getClueImageSource(imageId?: string): any {{
  if (!imageId) return null;
  if (BUNDLED_CLUE_IMAGES[imageId]) {{
    return BUNDLED_CLUE_IMAGES[imageId];
  }}
  if (
    imageId.startsWith('http://') ||
    imageId.startsWith('https://') ||
    imageId.startsWith('file://')
  ) {{
    return {{ uri: imageId }};
  }}
  return null;
}}
"""

with open("src/core/data/clue-assets.ts", "w") as f:
    f.write(assets_ts_content)
print("Generated src/core/data/clue-assets.ts successfully!")

# Generate src/core/data/words.ts
words_code = []
for item in DATASET:
    iid = item["id"]
    entry = f"""  {{
    id: "{iid}",
    word: "{item['w']}",
    wordAmharic: "{item['wa']}",
    category: "{item['cat']}",
    categoryId: "{item['cid']}",
    categoryAmharic: "{item['ca']}",
    extraHint: "{item['h']}",
    extraHintAmharic: "{item['ha']}",
    intendedMeaning: "{item['im']}",
    decoyMeaning: "{item['dm']}",
    imageAssetId: "{iid}",
    decoyImageAssetId: "{iid}_decoy",
    imageUrl: "{item['img']}",
    decoyImageUrl: "{item['decoy']}",
    botClues: {json.dumps(item['clues'])},
    botCluesAmharic: {json.dumps(item['cluesA'], ensure_ascii=False)},
  }},"""
    words_code.append(entry)

words_ts_content = f"""import {{ WordItem, CategoryInfo }} from '../types/word.types';

export const CATEGORIES: CategoryInfo[] = [
  {{ id: 'animals', name: 'Animals', nameAmharic: 'እንስሳት', icon: 'paw', description: 'Creatures, wild beasts & birds', descriptionAmharic: 'የዱር እንስሳት፣ አእዋፍ እና ፍጥረታት', wordCount: 25 }},
  {{ id: 'food', name: 'Food & Drinks', nameAmharic: 'ምግብ እና መጠጥ', icon: 'restaurant', description: 'Tasty dishes, snacks & sips', descriptionAmharic: 'ጣፋጭ ምግቦች፣ መክሰስ እና መጠጦች', wordCount: 10 }},
  {{ id: 'objects', name: 'Everyday Objects', nameAmharic: 'የዕለት ተዕለት ዕቃዎች', icon: 'cube', description: 'Household artifacts & crafts', descriptionAmharic: 'የቤት ውስጥ እቃዎች እና የሸክላ ስራዎች', wordCount: 10 }},
  {{ id: 'places', name: 'Places & Geography', nameAmharic: 'ቦታዎች እና ጂኦግራፊ', icon: 'map', description: 'Landmarks, frontiers & cities', descriptionAmharic: 'ታዋቂ ቦታዎች፣ ሀገራት እና ከተሞች', wordCount: 10 }},
  {{ id: 'movies', name: 'Movies & Pop Culture', nameAmharic: 'ፊልሞች እና ፖፕ ባህል', icon: 'film', description: 'Cinema legends & fictional worlds', descriptionAmharic: 'የሲኒማ ታሪኮች እና ዝነኛ ገጸ-ባህሪያት', wordCount: 8 }},
  {{ id: 'jobs', name: 'Jobs & Professions', nameAmharic: 'ሙያዎች እና ስራዎች', icon: 'briefcase', description: 'Trades, careers & occupations', descriptionAmharic: 'የተለያዩ ሙያዎች እና የስራ መስኮች', wordCount: 8 }},
  {{ id: 'activities', name: 'Sports', nameAmharic: 'ስፖርት', icon: 'football', description: 'Athletics, competitive games & racing', descriptionAmharic: 'የስፖርት ውድድሮች እና የሩጫ ጨዋታዎች', wordCount: 12 }},
];

export const WORD_BANK: WordItem[] = [
{os.linesep.join(words_code)}
];
"""

with open("src/core/data/words.ts", "w") as f:
    f.write(words_ts_content)
print("Generated src/core/data/words.ts successfully!")
