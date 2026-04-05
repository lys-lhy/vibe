import random
import requests
import hashlib
from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__)
app.secret_key = 'climate-earth-secret-key-change-in-production'

# 🌿 Trefle API 配置
TREFLE_TOKEN = 'usr-pkJM7T09TNf0Y5jcISw_wKJbW7y-mzleDeeo-PLKa7U'
TREFLE_BASE = 'https://trefle.io/api/v1'

# =============================================================================
# 🗺️ 大陆区域定义（简化版 - 用于植被分布可视化）
# 格式: {大陆代码: {名称, 颜色, 边界框, 优势植物列表}}
# =============================================================================
CONTINENTS = {
    "europe": {
        "name": "Europe",
        "color": "#4a90e2",
        "bounds": {"lat_min": 35, "lat_max": 71, "lng_min": -10, "lng_max": 40},
        "native_plants": ["quercus-robur", "fagus-sylvatica", "pinus-sylvestris", "acer-pseudoplatanus"]
    },
    "asia": {
        "name": "Asia",
        "color": "#e94b3c",
        "bounds": {"lat_min": -10, "lat_max": 77, "lng_min": 25, "lng_max": 180},
        "native_plants": ["pinus-sylvestris", "quercus-robur", "acer-pseudoplatanus"]
    },
    "africa": {
        "name": "Africa",
        "color": "#f5a623",
        "bounds": {"lat_min": -35, "lat_max": 37, "lng_min": -20, "lng_max": 52},
        "native_plants": ["ceiba-pentandra", "theobroma-cacao", "coffea-arabica"]
    },
    "north_america": {
        "name": "North America",
        "color": "#7ed321",
        "bounds": {"lat_min": 15, "lat_max": 72, "lng_min": -170, "lng_max": -50},
        "native_plants": ["pinus-sylvestris", "quercus-robur", "acer-pseudoplatanus"]
    },
    "south_america": {
        "name": "South America",
        "color": "#50e3c2",
        "bounds": {"lat_min": -56, "lat_max": 12, "lng_min": -82, "lng_max": -35},
        "native_plants": ["ceiba-pentandra", "theobroma-cacao", "coffea-arabica"]
    },
    "oceania": {
        "name": "Oceania",
        "color": "#bd10e0",
        "bounds": {"lat_min": -47, "lat_max": -10, "lng_min": 110, "lng_max": 180},
        "native_plants": ["eucalyptus-globulus"]
    },
    "antarctica": {
        "name": "Antarctica",
        "color": "#d0d0d0",
        "bounds": {"lat_min": -90, "lat_max": -60, "lng_min": -180, "lng_max": 180},
        "native_plants": []  # No native vascular plants
    }
}

# =============================================================================
# 🌿 植物模型配置（3D几何体参数 + 视觉属性）
# 用于在Three.js中生成不同品种的植物模型
# =============================================================================
PLANT_MODELS = {
    # === 乔木类 (Trees) ===
    "quercus-robur": {  # English Oak
        "name": "English Oak",
        "scientific_name": "Quercus robur",
        "family": "Fagaceae",
        "type": "tree",
        "color": "#2d5016",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.4, "radius": 0.06, "color": "#5d4037"},
            "crown": {"geometry": "sphere", "radius": 0.25, "color": "#2d5016", "segments": 8},
            "scale": 1.0
        },
        "info": "Deciduous tree native to Europe. Can live 1000+ years."
    },
    "pinus-sylvestris": {  # Scots Pine
        "name": "Scots Pine",
        "scientific_name": "Pinus sylvestris",
        "family": "Pinaceae",
        "type": "conifer",
        "color": "#1b4d3e",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.5, "radius": 0.05, "color": "#6d4c41"},
            "crown": {"geometry": "cone", "radius": 0.15, "height": 0.35, "color": "#1b4d3e", "segments": 6},
            "scale": 1.1
        },
        "info": "Evergreen conifer. Iconic twisted trunk in harsh climates."
    },
    "fagus-sylvatica": {  # European Beech
        "name": "European Beech",
        "scientific_name": "Fagus sylvatica",
        "family": "Fagaceae",
        "type": "tree",
        "color": "#4a7c59",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.45, "radius": 0.07, "color": "#8d6e63"},
            "crown": {"geometry": "sphere", "radius": 0.28, "color": "#4a7c59", "segments": 10},
            "scale": 1.0
        },
        "info": "Smooth grey bark, dense canopy. Dominates European forests."
    },
    "acer-pseudoplatanus": {  # Sycamore Maple
        "name": "Sycamore Maple",
        "scientific_name": "Acer pseudoplatanus",
        "family": "Sapindaceae",
        "type": "tree",
        "color": "#6b8e23",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.4, "radius": 0.06, "color": "#795548"},
            "crown": {"geometry": "dodecahedron", "radius": 0.24, "color": "#6b8e23"},
            "scale": 0.95
        },
        "info": "Fast-growing maple with distinctive winged seeds."
    },
    
    # === 热带作物类 (Tropical) ===
    "ceiba-pentandra": {  # Kapok
        "name": "Kapok Tree",
        "scientific_name": "Ceiba pentandra",
        "family": "Malvaceae",
        "type": "tropical_tree",
        "color": "#228b22",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.6, "radius": 0.08, "color": "#5d4037"},
            "crown": {"geometry": "cone", "radius": 0.3, "height": 0.4, "color": "#228b22", "segments": 8},
            "scale": 1.2
        },
        "info": "Giant tropical tree. Buttress roots can reach 3m high."
    },
    "theobroma-cacao": {  # Cacao
        "name": "Cacao Tree",
        "scientific_name": "Theobroma cacao",
        "family": "Malvaceae",
        "type": "understory",
        "color": "#4a3728",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.25, "radius": 0.04, "color": "#6d4c41"},
            "crown": {"geometry": "octahedron", "radius": 0.18, "color": "#4a3728"},
            "scale": 0.7
        },
        "info": "Source of chocolate. Grows in rainforest understory."
    },
    "coffea-arabica": {  # Arabica Coffee
        "name": "Arabica Coffee",
        "scientific_name": "Coffea arabica",
        "family": "Rubiaceae",
        "type": "shrub",
        "color": "#3d5a3d",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.2, "radius": 0.03, "color": "#795548"},
            "crown": {"geometry": "sphere", "radius": 0.15, "color": "#3d5a3d", "segments": 6},
            "scale": 0.6
        },
        "info": "Most widely cultivated coffee species. Prefers high altitudes."
    },
    
    # === 大洋洲特有 ===
    "eucalyptus-globulus": {  # Blue Gum
        "name": "Blue Gum Eucalyptus",
        "scientific_name": "Eucalyptus globulus",
        "family": "Myrtaceae",
        "type": "eucalypt",
        "color": "#556b2f",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.55, "radius": 0.05, "color": "#a1887f"},
            "crown": {"geometry": "cone", "radius": 0.2, "height": 0.3, "color": "#556b2f", "segments": 7},
            "scale": 1.15
        },
        "info": "Fast-growing Australian native. Leaves contain aromatic oils."
    }
}

# =============================================================================
# 🌿 模拟植物分布数据（带大陆归属）
# =============================================================================
DEMO_PLANT_DISTRIBUTIONS = {
    "quercus-robur": {
        **PLANT_MODELS["quercus-robur"],
        "points": [
            {"lat": 51.5, "lng": -0.1, "abundance": 0.8, "region": "europe", "elevation": 100},
            {"lat": 48.8, "lng": 2.3, "abundance": 0.7, "region": "europe", "elevation": 35},
            {"lat": 52.5, "lng": 13.4, "abundance": 0.9, "region": "europe", "elevation": 34},
            {"lat": 55.7, "lng": 37.6, "abundance": 0.5, "region": "europe", "elevation": 156},
            {"lat": 45.4, "lng": 10.9, "abundance": 0.6, "region": "europe", "elevation": 59},
            {"lat": 43.7, "lng": -79.4, "abundance": 0.4, "region": "north_america", "elevation": 76},  # Introduced
        ]
    },
    "pinus-sylvestris": {
        **PLANT_MODELS["pinus-sylvestris"],
        "points": [
            {"lat": 60.1, "lng": 24.9, "abundance": 0.9, "region": "europe", "elevation": 17},
            {"lat": 59.9, "lng": 10.7, "abundance": 0.8, "region": "europe", "elevation": 23},
            {"lat": 64.2, "lng": -14.9, "abundance": 0.7, "region": "europe", "elevation": 25},
            {"lat": 66.0, "lng": 25.0, "abundance": 0.6, "region": "europe", "elevation": 195},
            {"lat": 55.0, "lng": 82.9, "abundance": 0.75, "region": "asia", "elevation": 164},
            {"lat": 49.2, "lng": -123.1, "abundance": 0.5, "region": "north_america", "elevation": 70},  # Introduced
        ]
    },
    "fagus-sylvatica": {
        **PLANT_MODELS["fagus-sylvatica"],
        "points": [
            {"lat": 47.3, "lng": 8.5, "abundance": 0.8, "region": "europe", "elevation": 408},
            {"lat": 46.2, "lng": 6.1, "abundance": 0.7, "region": "europe", "elevation": 375},
            {"lat": 45.4, "lng": 10.9, "abundance": 0.6, "region": "europe", "elevation": 59},
            {"lat": 47.0, "lng": 2.0, "abundance": 0.75, "region": "europe", "elevation": 180},
            {"lat": 49.0, "lng": 8.0, "abundance": 0.7, "region": "europe", "elevation": 115},
        ]
    },
    "acer-pseudoplatanus": {
        **PLANT_MODELS["acer-pseudoplatanus"],
        "points": [
            {"lat": 50.1, "lng": 8.6, "abundance": 0.7, "region": "europe", "elevation": 112},
            {"lat": 49.6, "lng": 6.1, "abundance": 0.6, "region": "europe", "elevation": 300},
            {"lat": 51.2, "lng": 4.4, "abundance": 0.8, "region": "europe", "elevation": 7},
            {"lat": 45.4, "lng": -75.7, "abundance": 0.5, "region": "north_america", "elevation": 70},  # Introduced
        ]
    },
    "ceiba-pentandra": {
        **PLANT_MODELS["ceiba-pentandra"],
        "points": [
            {"lat": 3.1, "lng": 101.6, "abundance": 0.9, "region": "asia", "elevation": 22},
            {"lat": -3.7, "lng": -38.5, "abundance": 0.8, "region": "south_america", "elevation": 21},
            {"lat": 6.5, "lng": 3.3, "abundance": 0.7, "region": "africa", "elevation": 41},
            {"lat": 13.7, "lng": 100.5, "abundance": 0.6, "region": "asia", "elevation": 2},
            {"lat": -1.3, "lng": 36.8, "abundance": 0.75, "region": "africa", "elevation": 1795},
            {"lat": -12.0, "lng": -77.0, "abundance": 0.65, "region": "south_america", "elevation": 154},
        ]
    },
    "eucalyptus-globulus": {
        **PLANT_MODELS["eucalyptus-globulus"],
        "points": [
            {"lat": -37.8, "lng": 144.9, "abundance": 0.9, "region": "oceania", "elevation": 31},
            {"lat": -33.8, "lng": 151.2, "abundance": 0.8, "region": "oceania", "elevation": 58},
            {"lat": -31.9, "lng": 115.8, "abundance": 0.7, "region": "oceania", "elevation": 20},
            {"lat": -42.8, "lng": 147.3, "abundance": 0.6, "region": "oceania", "elevation": 4},
            {"lat": -34.9, "lng": 138.6, "abundance": 0.75, "region": "oceania", "elevation": 50},
            {"lat": -36.8, "lng": 174.7, "abundance": 0.65, "region": "oceania", "elevation": 26},  # New Zealand
        ]
    },
    "coffea-arabica": {
        **PLANT_MODELS["coffea-arabica"],
        "points": [
            {"lat": 9.0, "lng": 38.7, "abundance": 0.9, "region": "africa", "elevation": 2355},
            {"lat": -1.2, "lng": 36.8, "abundance": 0.85, "region": "africa", "elevation": 1795},
            {"lat": -23.5, "lng": -46.6, "abundance": 0.8, "region": "south_america", "elevation": 760},
            {"lat": 10.5, "lng": -66.9, "abundance": 0.7, "region": "south_america", "elevation": 900},
            {"lat": 14.5, "lng": -90.5, "abundance": 0.75, "region": "north_america", "elevation": 1500},
            {"lat": -8.5, "lng": 125.0, "abundance": 0.65, "region": "asia", "elevation": 1200},
        ]
    },
    "theobroma-cacao": {
        **PLANT_MODELS["theobroma-cacao"],
        "points": [
            {"lat": 6.5, "lng": 3.3, "abundance": 0.9, "region": "africa", "elevation": 41},
            {"lat": 5.5, "lng": -0.2, "abundance": 0.85, "region": "africa", "elevation": 61},
            {"lat": -3.7, "lng": -38.5, "abundance": 0.8, "region": "south_america", "elevation": 21},
            {"lat": 10.0, "lng": -66.0, "abundance": 0.75, "region": "south_america", "elevation": 900},
            {"lat": -12.0, "lng": -77.0, "abundance": 0.7, "region": "south_america", "elevation": 154},
        ]
    }
}

# =============================================================================
# 🧠 测验题库 (25+ 问题)
# =============================================================================
QUESTIONS = [
    # === Temperature Questions ===
    {"id": 1, "dataset": "temp", "year_min": 1880, "year_max": 1920, 
     "q": "In the late 19th century, what was the primary driver of global temperature stability?", 
     "choices": ["Solar Cycles", "Volcanic Activity", "Industrial Emissions", "Ocean Currents"], 
     "ans": 0, "exp": "Solar cycles and volcanic activity were dominant natural forcings before heavy industrialization."},
    {"id": 2, "dataset": "temp", "year_min": 1940, "year_max": 1970, 
     "q": "Why did global temperatures plateau between 1940-1970 despite rising CO2?", 
     "choices": ["Solar Minimum", "Industrial Aerosols", "Ocean Absorption", "Data Error"], 
     "ans": 1, "exp": "Industrial aerosols reflected sunlight, masking the warming effect of greenhouse gases."},
    {"id": 3, "dataset": "temp", "year_min": 1990, "year_max": 2025, 
     "q": "Which region is warming significantly faster than the global average?", 
     "choices": ["The Equator", "The Arctic", "Australia", "The Amazon"], 
     "ans": 1, "exp": "Arctic Amplification causes the poles to warm 2-3 times faster than the rest of the planet."},
    {"id": 4, "dataset": "temp", "year_min": 2015, "year_max": 2025, 
     "q": "What phenomenon contributed to 2016 being one of the hottest years?", 
     "choices": ["La Niña", "El Niño", "Solar Flare", "Volcanic Eruption"], 
     "ans": 1, "exp": "A strong El Niño event released massive heat from the Pacific Ocean into the atmosphere."},
    {"id": 5, "dataset": "temp", "year_min": 1880, "year_max": 2025, 
     "q": "What is the 'Albedo Effect' in the context of melting ice?", 
     "choices": ["Ice absorbs heat", "Ice reflects sunlight", "Ice traps CO2", "Ice creates wind"], 
     "ans": 1, "exp": "White ice reflects sunlight. When it melts, dark ocean absorbs heat, accelerating warming."},
    {"id": 6, "dataset": "temp", "year_min": 1880, "year_max": 1900, 
     "q": "What baseline period does NASA GISS use for temperature anomalies?", 
     "choices": ["1951-1980", "1900-1950", "1880-1900", "2000-2020"], 
     "ans": 0, "exp": "NASA GISS typically uses 1951-1980 as the baseline average for anomaly calculations."},
    
    # === CO2 Questions ===
    {"id": 7, "dataset": "co2", "year_min": 1880, "year_max": 1950, 
     "q": "Before the industrial revolution, atmospheric CO2 hovered around what level?", 
     "choices": ["180 ppm", "280 ppm", "350 ppm", "400 ppm"], 
     "ans": 1, "exp": "Ice core data shows CO2 levels were stable around 280 ppm for thousands of years."},
    {"id": 8, "dataset": "co2", "year_min": 1950, "year_max": 1980, 
     "q": "The 'Keeling Curve' began in 1958. What trend did it famously reveal?", 
     "choices": ["Seasonal Oscillation only", "Steady Decline", "Steady Rise + Oscillation", "Random Fluctuation"], 
     "ans": 2, "exp": "It showed a sawtooth pattern: a steady long-term rise superimposed on seasonal plant cycles."},
    {"id": 9, "dataset": "co2", "year_min": 2000, "year_max": 2025, 
     "q": "In 2023, atmospheric CO2 crossed which major threshold?", 
     "choices": ["350 ppm", "400 ppm", "420 ppm", "500 ppm"], 
     "ans": 2, "exp": "CO2 levels surpassed 420 ppm, the highest in millions of years."},
    {"id": 10, "dataset": "co2", "year_min": 1900, "year_max": 2025, 
     "q": "Which sector is currently the largest contributor to global CO2 emissions?", 
     "choices": ["Agriculture", "Transportation", "Energy (Electricity/Heat)", "Waste"], 
     "ans": 2, "exp": "Burning fossil fuels for electricity and heat is the single largest source."},
    {"id": 11, "dataset": "co2", "year_min": 1950, "year_max": 2025, 
     "q": "What is the primary sink that absorbs about 30% of human CO2 emissions?", 
     "choices": ["The Ocean", "The Soil", "Clouds", "Rocks"], 
     "ans": 0, "exp": "The ocean acts as a massive carbon sink, though this causes ocean acidification."},
    {"id": 12, "dataset": "co2", "year_min": 2020, "year_max": 2025, 
     "q": "Did global CO2 emissions drop permanently during the 2020 pandemic lockdowns?", 
     "choices": ["Yes, permanently", "No, they rebounded quickly", "They dropped to zero", "They increased"], 
     "ans": 1, "exp": "Emissions dropped temporarily but rebounded to record highs shortly after."},
    
    # === Rainfall Questions ===
    {"id": 13, "dataset": "rain", "year_min": 1980, "year_max": 2025, 
     "q": "As the atmosphere warms, it holds more moisture. What is the general precipitation trend?", 
     "choices": ["Uniform drying", "Uniform wetting", "Wet gets wetter, Dry gets drier", "No change"], 
     "ans": 2, "exp": "Climate change intensifies the water cycle, leading to more extreme floods and droughts."},
    {"id": 14, "dataset": "rain", "year_min": 2000, "year_max": 2025, 
     "q": "Which phenomenon is linked to increased rainfall variability in the Pacific?", 
     "choices": ["ENSO (El Niño/La Niña)", "Gulf Stream", "Jet Stream", "Monsoons"], 
     "ans": 0, "exp": "ENSO cycles drastically alter rainfall patterns across the globe."},
    {"id": 15, "dataset": "rain", "year_min": 1980, "year_max": 2025, 
     "q": "How does climate change affect hurricane intensity?", 
     "choices": ["Makes them slower", "Makes them weaker", "Increases wind speed & rainfall", "No effect"], 
     "ans": 2, "exp": "Warmer ocean waters provide more energy, fueling stronger storms with more rain."},
    {"id": 16, "dataset": "rain", "year_min": 1980, "year_max": 2025, 
     "q": "Shifts in the Jet Stream can cause what kind of weather events?", 
     "choices": ["Stagnant heatwaves/floods", "Constant sunshine", "Global cooling", "Earthquakes"], 
     "ans": 0, "exp": "A wavier Jet Stream can get 'stuck', causing prolonged weather extremes."},
    
    # === Vegetation Questions ===
    {"id": 17, "dataset": "vegetation", "year_min": 1880, "year_max": 2025, 
     "q": "Which biome contains the highest biodiversity of plant species?", 
     "choices": ["Tundra", "Tropical Rainforest", "Desert", "Temperate Forest"], 
     "ans": 1, "exp": "Tropical rainforests contain over 50% of Earth's plant species despite covering only 6% of land."},
    {"id": 18, "dataset": "vegetation", "year_min": 2000, "year_max": 2025, 
     "q": "What is 'deforestation' primarily driven by in tropical regions?", 
     "choices": ["Urban expansion", "Agriculture & livestock", "Mining", "All of the above"], 
     "ans": 3, "exp": "All factors contribute, but agriculture (soy, palm oil, cattle) is the dominant driver."},
    {"id": 19, "dataset": "vegetation", "year_min": 1990, "year_max": 2025, 
     "q": "How does plant phenology respond to warming?", 
     "choices": ["No change", "Earlier spring events", "Later spring events", "Random"], 
     "ans": 1, "exp": "Warmer temperatures cause earlier budburst and flowering, disrupting ecosystem synchrony."},
    {"id": 20, "dataset": "vegetation", "year_min": 2010, "year_max": 2025, 
     "q": "What percentage of plant species are at risk from climate change?", 
     "choices": ["5-10%", "15-20%", "30-50%", ">70%"], 
     "ans": 2, "exp": "Studies suggest 30-50% of plant species face elevated extinction risk with 2-3°C warming."},
    {"id": 21, "dataset": "vegetation", "year_min": 1880, "year_max": 2025, 
     "q": "What is a 'climate refugia' for plants?", 
     "choices": ["Botanical garden", "Area with stable microclimate", "Greenhouse", "Seed bank"], 
     "ans": 1, "exp": "Refugia are areas where species can survive regional climate changes due to local conditions."},
    {"id": 22, "dataset": "vegetation", "year_min": 2000, "year_max": 2025, 
     "q": "What is the main threat to coffee production from climate change?", 
     "choices": ["Too much sun", "Shrinking suitable growing areas", "Pest resistance", "Soil depletion"], 
     "ans": 1, "exp": "Rising temperatures and changing rainfall patterns reduce areas suitable for Arabica coffee."},
    
    # === General/Mixed Questions ===
    {"id": 23, "dataset": "temp", "year_min": 2010, "year_max": 2025, 
     "q": "Permafrost thawing releases which potent greenhouse gas?", 
     "choices": ["CO2", "Methane", "Ozone", "Nitrous Oxide"], 
     "ans": 1, "exp": "Methane is released from decomposing organic matter trapped in frozen ground."},
    {"id": 24, "dataset": "temp", "year_min": 1990, "year_max": 2025, 
     "q": "What is the goal of the Paris Agreement regarding temperature rise?", 
     "choices": ["< 1.0°C", "< 1.5°C to 2.0°C", "< 3.0°C", "No limit"], 
     "ans": 1, "exp": "The goal is to limit warming to well below 2°C, preferably 1.5°C."},
    {"id": 25, "dataset": "co2", "year_min": 1880, "year_max": 2025, 
     "q": "Which gas has higher Global Warming Potential than CO2 but shorter lifespan?", 
     "choices": ["Nitrogen", "Methane", "Argon", "Oxygen"], 
     "ans": 1, "exp": "Methane traps much more heat per molecule than CO2 but breaks down faster."},
]

# =============================================================================
# 🔄 Flask Routes
# =============================================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/round/start', methods=['POST'])
def start_round():
    session_id = request.remote_addr
    session['quiz_state'] = {
        'question_count': 0,
        'correct_count': 0,
        'history': []
    }
    return jsonify({"status": "started", "session_id": session_id})

@app.route('/api/question/next', methods=['POST'])
def next_question():
    data = request.json or {}
    context = data.get('context', {})
    dataset = context.get('dataset', 'temp')
    year = int(context.get('year', 2000))
    
    relevant = [q for q in QUESTIONS 
                if q['dataset'] == dataset and q['year_min'] <= year <= q['year_max']]
    if not relevant:
        relevant = [q for q in QUESTIONS if q['dataset'] == dataset]
    if not relevant:
        relevant = QUESTIONS

    q = random.choice(relevant)
    return jsonify({
        "qid": q['id'],
        "prompt": q['q'],
        "choices": q['choices']
    })

@app.route('/api/answer/check', methods=['POST'])
def check_answer():
    data = request.json or {}
    qid = data.get('qid')
    choice_idx = data.get('choice_index')
    
    q = next((item for item in QUESTIONS if item["id"] == qid), None)
    if not q:
        return jsonify({"error": "Question not found"}), 404

    is_correct = (choice_idx == q['ans'])
    
    if 'quiz_state' in session:
        session['quiz_state']['question_count'] += 1
        if is_correct:
            session['quiz_state']['correct_count'] += 1
            
    return jsonify({
        "correct": is_correct,
        "explanation": q['exp'],
        "done": session.get('quiz_state', {}).get('question_count', 0) >= 10,
        "correct_count": session.get('quiz_state', {}).get('correct_count', 0)
    })

# =============================================================================
# 🌿 Vegetation & Continent Data API
# =============================================================================

@app.route('/api/vegetation/data', methods=['GET'])
def get_vegetation_data():
    """Returns plant distribution data with continent information"""
    demo_mode = request.args.get('demo', 'true').lower() == 'true'
    plant_slug = request.args.get('slug')
    include_continents = request.args.get('continents', 'true').lower() == 'true'
    
    if demo_mode:
        response_data = {"source": "demo", "plants": {}}
        
        if plant_slug and plant_slug in DEMO_PLANT_DISTRIBUTIONS:
            response_data["plants"][plant_slug] = DEMO_PLANT_DISTRIBUTIONS[plant_slug]
        else:
            response_data["plants"] = DEMO_PLANT_DISTRIBUTIONS
        
        if include_continents:
            response_data["continents"] = CONTINENTS
        
        return jsonify(response_data)
    
    # Production mode with Trefle API (simplified)
    if not TREFLE_TOKEN or TREFLE_TOKEN == 'YOUR_TREFLE_TOKEN':
        return jsonify({
            "error": "Trefle token not configured",
            "source": "demo_fallback",
            "plants": DEMO_PLANT_DISTRIBUTIONS,
            "continents": CONTINENTS if include_continents else None
        }), 400
    
    try:
        # For production, fetch from Trefle and enrich with continent data
        if plant_slug:
            url = f"{TREFLE_BASE}/species/{plant_slug}/distributions?token={TREFLE_TOKEN}"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                dist_data = resp.json()
                result = _transform_trefle_with_continents(plant_slug, dist_data)
                return jsonify({
                    "source": "trefle", 
                    "plants": result,
                    "continents": CONTINENTS if include_continents else None
                })
        
        # Return simplified plant list with mock continent assignments
        url = f"{TREFLE_BASE}/plants?token={TREFLE_TOKEN}&page=1&per_page=20"
        resp = requests.get(url, timeout=10)
        
        if resp.status_code != 200:
            return jsonify({"error": "Failed to fetch from Trefle"}), 502
            
        plants_data = resp.json()
        simplified = []
        
        for p in plants_data.get('data', [])[:10]:
            slug = p.get('slug')
            simplified.append({
                "slug": slug,
                "scientific_name": p.get('scientific_name'),
                "family": p.get('family'),
                "common_name": p.get('common_name'),
                "model_config": PLANT_MODELS.get(slug, _generate_default_model(slug)),
                "mock_distribution": _generate_continent_distribution(slug)
            })
        
        return jsonify({
            "source": "trefle",
            "plants_list": simplified,
            "continents": CONTINENTS if include_continents else None
        })
        
    except Exception as e:
        return jsonify({"error": f"API error: {str(e)}"}), 500


def _transform_trefle_with_continents(slug, dist_data):
    """Transform Trefle data with continent assignment"""
    points = []
    data_items = dist_data.get('data', [])
    
    for dist in data_items:
        if dist.get('native'):
            region = dist.get('location', {}).get('name', '')
            continent = _coords_to_continent(*_region_to_coords(region))
            lat, lng = _region_to_coords(region)
            if lat and lng:
                points.append({
                    "lat": lat, "lng": lng, "abundance": 0.7,
                    "region": region, "continent": continent
                })
    
    plant_info = data_items[0] if data_items else {}
    model = PLANT_MODELS.get(slug, _generate_default_model(slug))
    
    return {
        slug: {
            **model,
            "points": points
        }
    }


def _coords_to_continent(lat, lng):
    """Determine continent from coordinates using simplified bounds"""
    if lat is None or lng is None:
        return None
    for code, data in CONTINENTS.items():
        bounds = data['bounds']
        if (bounds['lat_min'] <= lat <= bounds['lat_max'] and 
            bounds['lng_min'] <= lng <= bounds['lng_max']):
            return code
    return None


def _region_to_coords(region_name):
    """Map region name to approximate coordinates"""
    region_map = {
        "Europe": (54.0, 15.0), "Northern Europe": (62.0, 15.0),
        "Western Europe": (48.0, 2.0), "Eastern Europe": (52.0, 20.0),
        "Southern Europe": (42.0, 15.0), "Asia-Temperate": (45.0, 80.0),
        "Asia-Tropical": (15.0, 100.0), "Africa": (0.0, 20.0),
        "Northern Africa": (25.0, 15.0), "Western Africa": (8.0, -5.0),
        "Americas": (20.0, -90.0), "South America": (-15.0, -60.0),
        "Australia": (-25.0, 135.0), "Pacific": (-20.0, -150.0),
    }
    for key, coords in region_map.items():
        if key.lower() in region_name.lower():
            return coords
    return None, None


def _generate_default_model(slug):
    """Generate fallback plant model config"""
    return {
        "name": slug.replace('-', ' ').title(),
        "scientific_name": slug.replace('-', ' '),
        "family": "Unknown",
        "type": "shrub",
        "color": f"#{random.randint(0x20,0x60):02x}{random.randint(0x40,0x80):02x}{random.randint(0x20,0x50):02x}",
        "model": {
            "trunk": {"geometry": "cylinder", "height": 0.25, "radius": 0.04, "color": "#6d4c41"},
            "crown": {"geometry": "sphere", "radius": 0.15, "color": "#4a7c59"},
            "scale": 0.8
        },
        "info": "Plant data from Trefle API"
    }


def _generate_continent_distribution(slug):
    """Generate mock distribution points across continents"""
    points = []
    plant = DEMO_PLANT_DISTRIBUTIONS.get(slug)
    if plant:
        # Use existing demo points
        return plant.get('points', [])
    
    # Generate random points in random continents
    for _ in range(random.randint(3, 6)):
        continent = random.choice(list(CONTINENTS.keys()))
        if continent == 'antarctica':
            continue
        bounds = CONTINENTS[continent]['bounds']
        lat = random.uniform(bounds['lat_min'], bounds['lat_max'])
        lng = random.uniform(bounds['lng_min'], bounds['lng_max'])
        points.append({
            "lat": round(lat, 2), "lng": round(lng, 2),
            "abundance": round(random.uniform(0.4, 0.95), 2),
            "region": f"{continent}_region",
            "continent": continent,
            "elevation": random.randint(0, 2000)
        })
    return points


def _get_family_color(family):
    """Assign color per plant family"""
    colors = {
        "Fagaceae": "#2d5016", "Pinaceae": "#1b4d3e", 
        "Sapindaceae": "#6b8e23", "Malvaceae": "#228b22",
        "Myrtaceae": "#556b2f", "Orchidaceae": "#9370db",
        "Fabaceae": "#32cd32", "Poaceae": "#9acd32",
        "Rubiaceae": "#3d5a3d",
    }
    return colors.get(family, f"#{random.randint(0,0xFF):02x}{random.randint(0,0x55):02x}{random.randint(0,0x33):02x}")


def _generate_mock_coords(slug):
    """Generate deterministic mock coordinates"""
    if not slug:
        return {"lat": 0, "lng": 0}
    h = hashlib.md5(slug.encode()).hexdigest()
    lat = (int(h[:4], 16) % 180) - 90
    lng = (int(h[4:8], 16) % 360) - 180
    if abs(lat) > 70:
        lat *= 0.7
    return {"lat": round(lat, 2), "lng": round(lng, 2)}


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)