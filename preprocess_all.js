const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFile = '/Users/weilinchen/Projects/playgrounds/mrt-crowd/臺北捷運每日分時各站OD流量統計資料_202603.csv';
const outputDir = '/Users/weilinchen/Projects/playgrounds/mrt-crowd/mrt-dashboard/public/data';
const indexFile = path.join(outputDir, 'stations.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const lineMapping = {
    '板南線': ['頂埔', '永寧', '土城', '海山', '亞東醫院', '府中', '板橋', '新埔', '江子翠', '龍山寺', '西門', '台北車站', '善導寺', '忠孝新生', '忠孝復興', '忠孝敦化', '國父紀念館', '市政府', '永春', '後山埤', '昆陽', '南港', '南港展覽館'],
    '文湖線': ['動物園', '木柵', '萬芳社區', '萬芳醫院', '辛亥', '麟光', '六張犁', '科技大樓', '大安', '忠孝復興', '南京復興', '中山國中', '松山機場', '大直', '劍南路', '西湖', '港墘', '文德', '內湖', '大湖公園', '葫洲', '東湖', '南港軟體園區', '南港展覽館'],
    '淡水信義線': ['象山', '台北101/世貿', '信義安和', '大安', '大安森林公園', '東門', '中正紀念堂', '台大醫院', '台北車站', '中山', '雙連', '民權西路', '圓山', '劍潭', '士林', '芝山', '明德', '石牌', '唭哩岸', '奇岩', '北投', '新北投', '復興崗', '忠義', '關渡', '竹圍', '紅樹林', '淡水'],
    '松山新店線': ['松山', '南京三民', '台北小巨蛋', '南京復興', '松江南京', '中山', '北門', '西門', '小南門', '中正紀念堂', '古亭', '台電大樓', '公館', '萬隆', '景美', '大坪林', '七張', '新店區公所', '新店', '小碧潭'],
    '中和新蘆線': ['迴龍', '丹鳳', '輔大', '新莊', '頭前庄', '先嗇宮', '三重', '大橋頭', '民權西路', '中山國小', '行天宮', '松江南京', '忠孝新生', '東門', '古亭', '頂溪', '永安市場', '景安', '南勢角', '蘆洲', '三民高中', '徐匯中學', '三和國中', '三重國小'],
    '環狀線': ['大坪林', '十四張', '秀朗橋', '景平', '景安', '中和', '橋和', '中原', '板新', '板橋', '新埔民生', '頭前庄', '幸福', '新北產業園區']
};

const linePrefixes = {
    'BR': '文湖線',
    'R': '淡水信義線',
    'G': '松山新店線',
    'O': '中和新蘆線',
    'BL': '板南線',
    'Y': '環狀線'
};

const stationLines = {}; // stationName -> lineName

async function processCSV() {
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const allStats = {}; // stationName -> date -> hour -> { entry, exit }
    const stations = new Set();

    let isHeader = true;
    let count = 0;

    console.log('Starting first pass: Collecting data...');

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        const [date, hour, entryStation, exitStation, passengers] = line.split(',');
        const numPassengers = parseInt(passengers, 10);

        if (isNaN(numPassengers)) continue;

        // Add to sets
        stations.add(entryStation);
        stations.add(exitStation);

        // Process Entry
        if (!allStats[entryStation]) allStats[entryStation] = {};
        if (!allStats[entryStation][date]) allStats[entryStation][date] = {};
        if (!allStats[entryStation][date][hour]) allStats[entryStation][date][hour] = { entry: 0, exit: 0 };
        allStats[entryStation][date][hour].entry += numPassengers;

        // Process Exit
        if (!allStats[exitStation]) allStats[exitStation] = {};
        if (!allStats[exitStation][date]) allStats[exitStation][date] = {};
        if (!allStats[exitStation][date][hour]) allStats[exitStation][date][hour] = { entry: 0, exit: 0 };
        allStats[exitStation][date][hour].exit += numPassengers;

        count++;
        if (count % 1000000 === 0) {
            console.log(`Processed ${count} lines...`);
        }
    }

    console.log('Data collection finished. Generating files...');

    const stationIndex = {}; // lineName -> [ {id, name} ]

    for (const stationName of stations) {
        let cleanName = stationName;
        let lineName = '其他';

        // 1. Try prefix first (for transfer stations like BL板橋)
        for (const [prefix, name] of Object.entries(linePrefixes)) {
            if (stationName.startsWith(prefix)) {
                lineName = name;
                cleanName = stationName.replace(prefix, '');
                break;
            }
        }

        // 2. If no prefix or prefix didn't match perfectly, check mapping
        if (lineName === '其他') {
            for (const [line, stationsInLine] of Object.entries(lineMapping)) {
                if (stationsInLine.includes(stationName)) {
                    lineName = line;
                    break;
                }
            }
        }

        if (!stationIndex[lineName]) stationIndex[lineName] = [];
        
        const stationId = encodeURIComponent(stationName).replace(/%/g, '_');
        stationIndex[lineName].push({ id: stationId, name: stationName });

        const formattedData = formatStationData(allStats[stationName]);
        fs.writeFileSync(path.join(outputDir, `${stationId}.json`), JSON.stringify(formattedData));
    }

    // Save index
    fs.writeFileSync(indexFile, JSON.stringify(stationIndex, null, 2));
    console.log(`Index saved to ${indexFile}`);
    console.log(`Total stations processed: ${stations.size}`);
}

function formatStationData(stationStats) {
    const heatmap = [];
    const hourlyAggregation = {
        weekday: Array(24).fill(0).map(() => ({ entry: 0, exit: 0, count: 0 })),
        weekend: Array(24).fill(0).map(() => ({ entry: 0, exit: 0, count: 0 }))
    };

    for (const [date, hours] of Object.entries(stationStats)) {
        const d = new Date(date);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6; 
        const type = isWeekend ? 'weekend' : 'weekday';

        for (const [hour, counts] of Object.entries(hours)) {
            const h = parseInt(hour, 10);
            
            heatmap.push({
                date,
                hour: h,
                entry: counts.entry,
                exit: counts.exit,
                total: counts.entry + counts.exit
            });

            hourlyAggregation[type][h].entry += counts.entry;
            hourlyAggregation[type][h].exit += counts.exit;
            hourlyAggregation[type][h].count += 1;
        }
    }

    const averages = {
        weekday: hourlyAggregation.weekday.map((h, idx) => ({
            hour: idx,
            entry: h.count > 0 ? Math.round(h.entry / h.count) : 0,
            exit: h.count > 0 ? Math.round(h.exit / h.count) : 0,
            total: h.count > 0 ? Math.round((h.entry + h.exit) / h.count) : 0
        })),
        weekend: hourlyAggregation.weekend.map((h, idx) => ({
            hour: idx,
            entry: h.count > 0 ? Math.round(h.entry / h.count) : 0,
            exit: h.count > 0 ? Math.round(h.exit / h.count) : 0,
            total: h.count > 0 ? Math.round((h.entry + h.exit) / h.count) : 0
        }))
    };

    return { averages, heatmap };
}

processCSV().catch(console.error);
