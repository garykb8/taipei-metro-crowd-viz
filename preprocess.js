const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFile = '/Users/weilinchen/Projects/playgrounds/mrt-crowd/臺北捷運每日分時各站OD流量統計資料_202603.csv';
const outputFile = '/Users/weilinchen/Projects/playgrounds/mrt-crowd/mrt_data.json';

const TARGET_STATIONS = ['新埔', '劍南路', '忠孝復興', '江子翠'];

const stats = {
    xinpu: {},
    jiannan: {},
    zhongxiao: {},
    jiangzicui: {}
};

// stats structure: { date: { hour: { entry: 0, exit: 0 } } }

async function processCSV() {
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isHeader = true;
    let count = 0;

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        const [date, hour, entryStation, exitStation, passengers] = line.split(',');
        const numPassengers = parseInt(passengers, 10);

        if (isNaN(numPassengers)) continue;

        // Process Entry
        if (TARGET_STATIONS.includes(entryStation)) {
            let key = '';
            if (entryStation === '新埔') key = 'xinpu';
            else if (entryStation === '劍南路') key = 'jiannan';
            else if (entryStation === '忠孝復興') key = 'zhongxiao';
            else if (entryStation === '江子翠') key = 'jiangzicui';
            
            if (!stats[key][date]) stats[key][date] = {};
            if (!stats[key][date][hour]) stats[key][date][hour] = { entry: 0, exit: 0 };
            stats[key][date][hour].entry += numPassengers;
        }

        // Process Exit
        if (TARGET_STATIONS.includes(exitStation)) {
            let key = '';
            if (exitStation === '新埔') key = 'xinpu';
            else if (exitStation === '劍南路') key = 'jiannan';
            else if (exitStation === '忠孝復興') key = 'zhongxiao';
            else if (exitStation === '江子翠') key = 'jiangzicui';

            if (!stats[key][date]) stats[key][date] = {};
            if (!stats[key][date][hour]) stats[key][date][hour] = { entry: 0, exit: 0 };
            stats[key][date][hour].exit += numPassengers;
        }

        count++;
        if (count % 1000000 === 0) {
            console.log(`Processed ${count} lines...`);
        }
    }

    console.log('Calculation finished. Formatting data...');

    const result = {
        xinpu: formatStationData(stats.xinpu),
        jiannan: formatStationData(stats.jiannan),
        zhongxiao: formatStationData(stats.zhongxiao),
        jiangzicui: formatStationData(stats.jiangzicui)
    };

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Data saved to ${outputFile}`);
}

function formatStationData(stationStats) {
    const heatmap = [];
    const hourlyAggregation = {
        weekday: Array(24).fill(0).map(() => ({ entry: 0, exit: 0, count: 0 })),
        weekend: Array(24).fill(0).map(() => ({ entry: 0, exit: 0, count: 0 }))
    };

    for (const [date, hours] of Object.entries(stationStats)) {
        const d = new Date(date);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6; // 0 is Sunday, 6 is Saturday
        const type = isWeekend ? 'weekend' : 'weekday';

        for (const [hour, counts] of Object.entries(hours)) {
            const h = parseInt(hour, 10);
            
            // Heatmap data
            heatmap.push({
                date,
                hour: h,
                entry: counts.entry,
                exit: counts.exit,
                total: counts.entry + counts.exit
            });

            // Aggregation for line chart
            hourlyAggregation[type][h].entry += counts.entry;
            hourlyAggregation[type][h].exit += counts.exit;
            hourlyAggregation[type][h].count += 1;
        }
    }

    // Calculate averages
    const averages = {
        weekday: hourlyAggregation.weekday.map(h => ({
            hour: h.hour,
            entry: h.count > 0 ? Math.round(h.entry / h.count) : 0,
            exit: h.count > 0 ? Math.round(h.exit / h.count) : 0,
            total: h.count > 0 ? Math.round((h.entry + h.exit) / h.count) : 0
        })).map((val, idx) => ({ ...val, hour: idx })),
        weekend: hourlyAggregation.weekend.map(h => ({
            hour: h.hour,
            entry: h.count > 0 ? Math.round(h.entry / h.count) : 0,
            exit: h.count > 0 ? Math.round(h.exit / h.count) : 0,
            total: h.count > 0 ? Math.round((h.entry + h.exit) / h.count) : 0
        })).map((val, idx) => ({ ...val, hour: idx }))
    };

    return { averages, heatmap };
}

processCSV().catch(console.error);
