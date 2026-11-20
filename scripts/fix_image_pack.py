import urllib.request, json, time, os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# Exact Wikipedia articles for 100% truthful images
EXACT_WIKI_MAP = {
    # Animals (All 25 animals)
    "a1": "Lion",
    "a2": "Penguin",
    "a3": "Elephant",
    "a4": "Kangaroo",
    "a5": "Chameleon",
    "a6": "Dolphin",
    "a7": "Giraffe",
    "a8": "Cheetah",
    "a9": "Owl",
    "a10": "Koala",
    "a11": "Shark",
    "a12": "Bat",
    "a13": "Giant_panda",
    "a14": "Flamingo",
    "a15": "Octopus",
    "a16": "Wolf",
    "a17": "Zebra",
    "a18": "Frog",
    "a19": "Hedgehog",
    "a20": "Golden_eagle",
    "a21": "Polar_bear",
    "a22": "Hippopotamus",
    "a23": "Rhinoceros",
    "a24": "Crocodile",
    "a25": "Peafowl",

    # Food & Drinks
    "f1": "Pizza",
    "f2": "Sushi",
    "f3": "Hamburger",
    "f4": "Injera",
    "f5": "Wat_(food)",
    "f6": "Kitfo",
    "f7": "Coffee",
    "f8": "Chocolate",
    "f9": "Ice_cream",
    "f10": "Taco",

    # Everyday Objects
    "o1": "Pottery",
    "o2": "Umbrella",
    "o3": "Headphones",
    "o4": "Mirror",
    "o5": "Watch",
    "o6": "Key_(lock)",
    "o7": "Backpack",
    "o8": "Guitar",
    "o9": "Candle",
    "o10": "Glasses",

    # Places & Geography
    "p1": "Lalibela",
    "p2": "Eiffel_Tower",
    "p3": "Giza_pyramid_complex",
    "p4": "Big_Ben",
    "p5": "Statue_of_Liberty",
    "p6": "Taj_Mahal",
    "p7": "Mount_Everest",
    "p8": "Colosseum",
    "p9": "Grand_Canyon",
    "p10": "Great_Wall_of_China",

    # Movies & Pop Culture
    "m1": "Titanic_(1997_film)",
    "m2": "Star_Wars",
    "m3": "Harry_Potter",
    "m4": "The_Matrix_(franchise)",
    "m5": "Batman",
    "m6": "Jurassic_Park",
    "m7": "The_Avengers_(2012_film)",
    "m8": "Spider-Man",

    # Jobs & Professions
    "j1": "Physician",
    "j2": "Firefighter",
    "j3": "Chef",
    "j4": "Aircraft_pilot",
    "j5": "Police_officer",
    "j6": "Astronaut",
    "j7": "Teacher",
    "j8": "Judge",

    # Sports
    "s1": "Association_football",
    "s2": "Basketball",
    "s3": "Cycling",
    "s4": "Swimming_(sport)",
    "s5": "Boxing",
    "s6": "Archery",
    "s7": "Tennis",
    "s8": "Underwater_diving",
    "s9": "Bowling",
    "s10": "Surfing",
    "s11": "Alpine_skiing",
    "s12": "Volleyball",
}

def get_wikimedia_thumb(title):
    api_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=pageimages&format=json&pithumbsize=400"
    req = urllib.request.Request(api_url, headers={'User-Agent': 'ImposterMobileApp/2.0 (contact: support@imposter.app)'})
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read())
            pages = data['query']['pages']
            for k, v in pages.items():
                if 'thumbnail' in v:
                    return v['thumbnail']['source']
    except Exception as e:
        print(f"Error fetching {title}: {e}")
    return None

os.makedirs('assets/clues', exist_ok=True)

success_count = 0
for iid, title in EXACT_WIKI_MAP.items():
    thumb_url = get_wikimedia_thumb(title)
    if thumb_url:
        target_path = f"assets/clues/{iid}.jpg"
        try:
            req = urllib.request.Request(thumb_url, headers={'User-Agent': 'ImposterMobileApp/2.0'})
            with urllib.request.urlopen(req, timeout=10) as resp, open(target_path, 'wb') as f:
                f.write(resp.read())
            print(f"Updated {iid}.jpg ({title}) -> {os.path.getsize(target_path)} bytes")
            success_count += 1
        except Exception as e:
            print(f"Failed to download image for {iid} ({title}): {e}")
    else:
        print(f"Could not find thumbnail for {iid} ({title})")
    time.sleep(0.08)

print(f"Done! Updated {success_count}/{len(EXACT_WIKI_MAP)} truthful images.")
