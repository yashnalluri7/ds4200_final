const indicators = [
    "HighBP", "HighChol", "BMI",
    "Age", "Sex",
    "GenHlth", 
];
const diabetesLabels = {
    0: "No Diabetes",
    1: "Prediabetic",
    2: "Diabetic"
};

const extendedIndicators = [
    "HighBP", "HighChol", "BMI",
    "Age", "Sex",
    "GenHlth", 
    "IsNoDiabetes", "IsPrediabetic", "IsDiabetic"
];

function pearsonCorrelation(arr1, arr2) {
    const n = arr1.length;
    const mean1 = d3.mean(arr1);
    const mean2 = d3.mean(arr2);
    const numerator = d3.sum(arr1.map((x, i) => (x - mean1) * (arr2[i] - mean2)));
    const denominator = Math.sqrt(
        d3.sum(arr1.map(x => Math.pow(x - mean1, 2))) *
        d3.sum(arr2.map(y => Math.pow(y - mean2, 2)))
    );
    return numerator / denominator;
}


// Load the data 
const demographics = d3.csv("diabetes_012_health_indicators_BRFSS2015.csv");

// Once the data is loaded, proceed with plotting
demographics.then(function(data) {
   console.log("CSV Data Loaded:", data);

   // Map diabetes condition to categorical values
   const diabetesConditionMap = {
       0: 'No Diabetes',
       1: 'Prediabetic',
       2: 'Diabetic'
   };
   const ageCategoryLabels = {
    1: "18–24",
    2: "25–29",
    3: "30–34",
    4: "35–39",
    5: "40–44",
    6: "45–49",
    7: "50–54",
    8: "55–59",
    9: "60–64",
    10: "65–69",
    11: "70–74",
    12: "75–79",
    13: "80+"
};

   // Convert necessary columns to numbers
   data.forEach(d => {
       d.Diabetes_012 = +d.Diabetes_012;
       d.Age = +d.Age;
   });

   // Aggregate data: Count occurrences of (Age, Diabetes_012)
   let ageGroups = d3.rollup(
       data,
       v => v.length,  // Count occurrences
       d => d.Age,
       d => d.Diabetes_012
   );

   // Convert rollup map into an array of objects
   let processedData = Array.from(ageGroups, ([age, conditions]) => {
       let entry = { 
        Age: age,
        Label: ageCategoryLabels[age] || `Age ${age}`
    };
       for (let [condition, count] of conditions) {
           entry[diabetesConditionMap[condition]] = count;  // Map condition names
       }
       return entry;
   });

   // Define chart dimensions
   let svg = d3.select("#ageChart"),
       margin = { top: 20, right: 20, bottom: 60, left: 60 },
       width = +svg.attr("width") - margin.left - margin.right,
       height = +svg.attr("height") - margin.top - margin.bottom;

   let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

   processedData.sort((a, b) => a.Age - b.Age);

    // Use mapped label values for x-axis domain in correct order
    let x = d3.scaleBand()
        .domain(processedData.map(d => d.Label))
        .range([0, width])
        .padding([0.2]);

   // Sub-group Scale for Diabetes Conditions
   let subX = d3.scaleBand()
       .domain(["No Diabetes", "Prediabetic", "Diabetic"])
       .range([0, x.bandwidth()])
       .padding(0.05);

   // Y Scale (Count)
   let y = d3.scaleLinear()
       .domain([0, d3.max(processedData, d => Math.max(d["No Diabetes"] || 0, d["Prediabetic"] || 0, d["Diabetic"] || 0))])
       .range([height, 0]);

   // X Axis
   g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)) // ← no filter on ticks!
    .selectAll("text")
    .attr("transform", "rotate(-45)") // Optional: tilt labels to avoid overlap
    .style("text-anchor", "end");

   // Y Axis
   g.append("g")
       .call(d3.axisLeft(y));

   // Axis Labels
   g.append("text")
       .attr("x", width / 2)
       .attr("y", height + 50)
       .style("text-anchor", "middle")
       .text("Age");

   g.append("text")
       .attr("x", -height / 2)
       .attr("y", -40)
       .attr("transform", "rotate(-90)")
       .style("text-anchor", "middle")
       .text("Count");

   // Colors for groups
   let color = d3.scaleOrdinal()
       .domain(["No Diabetes", "Prediabetic", "Diabetic"])
       .range(["steelblue", "orange", "red"]);

   // Create groups for each Age
   let ageGroup = g.selectAll(".ageGroup")
       .data(processedData)
       .enter().append("g")
       .attr("transform", d => `translate(${x(d.Label)},0)`);

   // Add bars for each Diabetes Condition
   ageGroup.selectAll("rect")
       .data(d => ["No Diabetes", "Prediabetic", "Diabetic"].map(condition => ({ key: condition, value: d[condition] || 0 })))
       .enter().append("rect")
       .attr("x", d => subX(d.key))
       .attr("y", d => y(d.value))
       .attr("width", subX.bandwidth())
       .attr("height", d => height - y(d.value))
       .attr("fill", d => color(d.key));

   // Add Legend
   let legend = g.append("g")
       .attr("transform", `translate(${width - 150},10)`);

   let legendData = ["No Diabetes", "Prediabetic", "Diabetic"];
   
   legend.selectAll("rect")
       .data(legendData)
       .enter().append("rect")
       .attr("x", 0)
       .attr("y", (d, i) => i * 20)
       .attr("width", 15)
       .attr("height", 15)
       .attr("fill", d => color(d));

   legend.selectAll("text")
       .data(legendData)
       .enter().append("text")
       .attr("x", 20)
       .attr("y", (d, i) => i * 20 + 12)
       .text(d => d);

    // ================================
    // HEATMAP - Health Indicators x Diabetes Status
    // ================================

    const heatmapMargin = { top: 20, right: 30, bottom: 60, left: 100 };
    const heatmapWidth = 800 - heatmapMargin.left - heatmapMargin.right;
    const heatmapHeight = 400 - heatmapMargin.top - heatmapMargin.bottom;

    const svgHeatmap = d3.select("#heatmapContainer").append("svg")
    .attr("width", heatmapWidth + heatmapMargin.left + heatmapMargin.right)
    .attr("height", heatmapHeight + heatmapMargin.top + heatmapMargin.bottom)
    .append("g")
    .attr("transform", `translate(${heatmapMargin.left},${heatmapMargin.top})`);

    // Prepare data for heatmap: compute average values of indicators by diabetes condition
    const grouped = d3.groups(data, d => diabetesConditionMap[d.Diabetes_012]);

    const avgData = grouped.map(([label, group]) => {
        const result = { label };
        indicators.forEach(ind => {
            const values = group.map(d => +d[ind]).filter(v => !isNaN(v));
            result[ind] = d3.mean(values);
        });
        return result;
    });

    // Compute average values per indicator per diabetes category
    const heatData = [];

    avgData.forEach(group => {
    indicators.forEach(ind => {
    heatData.push({
        condition: group.label,
        indicator: ind,
        value: group[ind]
    });
    });
    });

    // X: indicators, Y: diabetes labels
    const xHeat = d3.scaleBand()
    .domain(indicators)
    .range([0, heatmapWidth])
    .padding(0.05);

    const yHeat = d3.scaleBand()
    .domain(["No Diabetes", "Prediabetic", "Diabetic"])
    .range([0, heatmapHeight])
    .padding(0.05);

    // Color scale
    const colorHeat = d3.scaleSequential()
    .interpolator(d3.interpolateYlOrRd)
    .domain([0, d3.max(heatData, d => d.value)]);

    // X Axis
    svgHeatmap.append("g")
    .attr("transform", `translate(0,${heatmapHeight})`)
    .call(d3.axisBottom(xHeat))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

    // Y Axis
    svgHeatmap.append("g")
    .call(d3.axisLeft(yHeat));

    // Tooltip
    const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "6px 10px")
    .style("border", "1px solid #aaa")
    .style("border-radius", "4px")
    .style("visibility", "hidden");

    // Rects
    svgHeatmap.selectAll()
    .data(heatData)
    .enter()
    .append("rect")
    .attr("x", d => xHeat(d.indicator))
    .attr("y", d => yHeat(d.condition))
    .attr("width", xHeat.bandwidth())
    .attr("height", yHeat.bandwidth())
    .style("fill", d => colorHeat(d.value))
    .on("mouseover", function(event, d) {
    tooltip
        .style("visibility", "visible")
        .html(`<strong>${d.condition}</strong><br>${d.indicator}: ${d.value.toFixed(2)}`);
    d3.select(this).style("stroke", "#333").style("stroke-width", "1px");
    })
    .on("mousemove", function(event) {
    tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {
    tooltip.style("visibility", "hidden");
    d3.select(this).style("stroke", "none");
    });

    // Heatmap title
    svgHeatmap.append("text")
    .attr("x", heatmapWidth / 2)
    .attr("y", -10) // Try smaller values like -20, -30
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Average Health Indicator Values by Diabetes Condition");

    const corrMargin = { top: 20, right: 30, bottom: 60, left: 100 };
    const corrWidth = 800 - corrMargin.left - corrMargin.right;
    const corrHeight = 800 - corrMargin.top - corrMargin.bottom;

    // Extend Diabetes_012 into separate binary columns
    data.forEach(d => {
    d.Diabetes_012 = +d.Diabetes_012;
    d.IsNoDiabetes = d.Diabetes_012 === 0 ? 1 : 0;
    d.IsPrediabetic = d.Diabetes_012 === 1 ? 1 : 0;
    d.IsDiabetic = d.Diabetes_012 === 2 ? 1 : 0;
    });

    // Compute correlation matrix
    const corrData = [];

    for (let i = 0; i < extendedIndicators.length; i++) {
        for (let j = 0; j < extendedIndicators.length; j++) {
            const x = extendedIndicators[i];
            const y = extendedIndicators[j];
            const xVals = data.map(d => +d[x]);
            const yVals = data.map(d => +d[y]);
            const corr = pearsonCorrelation(xVals, yVals);
            corrData.push({ x, y, value: corr });
        }
    }

    const xCorr = d3.scaleBand()
        .domain(extendedIndicators)
        .range([0, corrWidth])
        .padding(0.05);

    const yCorr = d3.scaleBand()
        .domain(extendedIndicators)
        .range([0, corrHeight])
        .padding(0.05);

    const colorCorr = d3.scaleSequential()
        .interpolator(d3.interpolateRdBu)
        .domain([-1, 1]);

    const svgCorrHeatmap = d3.select("#corrMatrixContainer").append("svg")
        .attr("width", corrWidth + corrMargin.left + corrMargin.right)
        .attr("height", corrHeight + corrMargin.top + corrMargin.bottom)
        .append("g")
        .attr("transform", `translate(${corrMargin.left},${corrMargin.top})`);

    // Axes
    svgCorrHeatmap.append("g")
        .attr("transform", `translate(0,${corrHeight})`)
        .call(d3.axisBottom(xCorr))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    svgCorrHeatmap.append("g")
        .call(d3.axisLeft(yCorr));

    // Tooltip div
    const corrTooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "6px 10px")
        .style("border", "1px solid #aaa")
        .style("border-radius", "4px")
        .style("visibility", "hidden")
        .style("font-size", "12px");

    // Heatmap cells with interactivity
    svgCorrHeatmap.selectAll(".corr-cell")
        .data(corrData)
        .enter()
        .append("rect")
        .attr("class", "corr-cell")
        .attr("x", d => xCorr(d.x))
        .attr("y", d => yCorr(d.y))
        .attr("width", xCorr.bandwidth())
        .attr("height", yCorr.bandwidth())
        .style("fill", d => colorCorr(d.value))
        .on("mouseover", function(event, d) {
            svgCorrHeatmap.selectAll(".corr-cell")
                .style("opacity", r => r.x === d.x || r.y === d.y ? 1 : 0.15);

            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", "1.5px");

            corrTooltip
                .style("visibility", "visible")
                .html(`
                    <strong>${d.x} vs ${d.y}</strong><br>
                    Correlation: <span style="color:${d.value > 0 ? 'green' : 'red'}">${d.value.toFixed(2)}</span>
                `);
        })
        .on("mousemove", function(event) {
            corrTooltip
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            svgCorrHeatmap.selectAll(".corr-cell")
                .style("opacity", 1)
                .style("stroke", "none");

            corrTooltip.style("visibility", "hidden");
        });

    // Number labels
    svgCorrHeatmap.selectAll(".corr-label")
        .data(corrData)
        .enter()
        .append("text")
        .attr("class", "corr-label")
        .attr("x", d => xCorr(d.x) + xCorr.bandwidth() / 2)
        .attr("y", d => yCorr(d.y) + yCorr.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", "#000")
        .style("font-size", "10px")
        .text(d => d.value.toFixed(2));

    // Title
    svgCorrHeatmap.append("text")
        .attr("x", corrWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Correlation Matrix: Health Indicators + Diabetes Status");
});
