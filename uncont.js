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
    "HighBP", "HighChol", "BMI", "Age", "Sex", "GenHlth", 
    "IsNoDiabetes", "IsPrediabetic", "IsDiabetic"
];


function pearsonCorrelation(arr1, arr2) {
    const mean1 = d3.mean(arr1);
    const mean2 = d3.mean(arr2);
    const numerator = d3.sum(arr1.map((x, i) => (x - mean1) * (arr2[i] - mean2)));
    const denominator = Math.sqrt(
        d3.sum(arr1.map(x => Math.pow(x - mean1, 2))) *
        d3.sum(arr2.map(y => Math.pow(y - mean2, 2)))
    );
    return numerator / denominator;
}

function createSankeyDiagram(data) {
    console.log("Creating Sankey diagram with", data.length, "data points");
    
    // Define the nodes (Diabetes statuses and indicator levels)
    const nodes = [
        { name: "No Diabetes" },
        { name: "Prediabetic" },
        { name: "Diabetic" },
        { name: "Low BMI" },
        { name: "Normal BMI" },
        { name: "High BMI" },
        { name: "No HighBP" },
        { name: "Has HighBP" },
        { name: "No HighChol" },
        { name: "Has HighChol" },
    ];

    // Create a map to count links between nodes
    const linkMap = {};

    // Count the data for each group and create links between diabetes status and indicator levels
    data.forEach(d => {
        // Get the diabetes status index (0, 1, or 2)
        const diabetesStatusIndex = d.Diabetes_012;
        
        // Map BMI category to correct node index (3, 4, or 5)
        let bmiCategoryIndex;
        if (d.BMICategory === "Low BMI") bmiCategoryIndex = 3;
        else if (d.BMICategory === "Normal BMI") bmiCategoryIndex = 4;
        else bmiCategoryIndex = 5; // High BMI
        
        // Map HighBP to correct node index (6 or 7)
        const highBPIndex = d.HighBP === 0 ? 6 : 7;
        
        // Map HighChol to correct node index (8 or 9)
        const highCholIndex = d.HighChol === 0 ? 8 : 9;

        // Function to add or increment a link
        const addLink = (source, target) => {
            const key = `${source}-${target}`;
            if (!linkMap[key]) {
                linkMap[key] = { source, target, value: 0 };
            }
            linkMap[key].value += 1;
        };

        // Add links from diabetes status to each indicator
        addLink(diabetesStatusIndex, bmiCategoryIndex);
        addLink(diabetesStatusIndex, highBPIndex);
        addLink(diabetesStatusIndex, highCholIndex);
    });

    // Convert the linkMap to an array of links
    const links = Object.values(linkMap);
    
    // Debug info
    console.log("Generated links:", links);
    
    // Define the dimensions of the Sankey diagram
    const margin = { top: 20, right: 200, bottom: 30, left: 50 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#sankeyPlotContainer").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Diabetes Status Flow to Health Indicators");

    try {
        // Create graph structure with nodes and links
        const graph = { 
            nodes: nodes.map(d => Object.assign({}, d)), 
            links: links.map(d => Object.assign({}, d))
        };
        
        // Set up Sankey diagram generator
        const sankey = d3.sankey()
            .nodeWidth(20)
            .nodePadding(40)
            .size([width, height]);
            
        // Compute positions
        sankey(graph);
        
        // Get the path generator
        const sankeyLink = d3.sankeyLinkHorizontal();
        
        // Draw the links (flows)
        svg.append("g")
            .selectAll("path")
            .data(graph.links)
            .enter()
            .append("path")
            .attr("d", sankeyLink)
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("stroke", "#aaa")
            .attr("fill", "none")
            .attr("opacity", 0.7);

        // Add tooltips to links
        svg.append("g")
            .selectAll("title")
            .data(graph.links)
            .enter()
            .append("title")
            .text(d => {
                const sourceName = d.source.name || nodes[d.source].name;
                const targetName = d.target.name || nodes[d.target].name;
                return `${sourceName} → ${targetName}: ${d.value} patients`;
            });

        // Draw the nodes
        const node = svg.append("g")
            .selectAll("rect")
            .data(graph.nodes)
            .enter()
            .append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", (d, i) => i < 3 ? "#3498db" : "#1abc9c")
            .attr("stroke", "#000");
            
        // Add tooltips to nodes
        node.append("title")
            .text(d => `${d.name}: ${d.value || 0} patients`);

        // Add labels to the nodes
        svg.append("g")
            .selectAll("text")
            .data(graph.nodes)
            .enter()
            .append("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => `${d.name} (${d.value})`)
            .style("font-size", "12px")
            .style("font-weight", "bold");

        // Add link value labels
        svg.append("g")
            .selectAll("text")
            .data(graph.links)
            .enter()
            .append("text")
            .attr("x", d => (d.source.x1 + d.target.x0) / 2)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.value)
            .style("font-size", "10px")
            .style("fill", "#555")
            .style("pointer-events", "none");
            
    } catch (error) {
        console.error("Error creating Sankey diagram:", error);
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "red")
            .text("Error creating Sankey diagram: " + error.message);
    }
}

// Load and process CSV data
d3.csv("diabetes_012_health_indicators_BRFSS2015.csv").then(function(data) {
    // Sample a random subset of 1000 records
    data = data.sort(() => Math.random() - 0.5).slice(0, 1000);

    // Convert necessary columns to numbers
    data.forEach(d => {
        d.Diabetes_012 = +d.Diabetes_012;
        d.IsNoDiabetes = d.Diabetes_012 === 0 ? 1 : 0;
        d.IsPrediabetic = d.Diabetes_012 === 1 ? 1 : 0;
        d.IsDiabetic = d.Diabetes_012 === 2 ? 1 : 0;
        
        // Convert BMI to number
        d.BMI = +d.BMI;

        // Assign BMI categories based on the BMI value
        d.BMICategory = d.BMI < 25 ? "Low BMI" : d.BMI < 30 ? "Normal BMI" : "High BMI";

        // Convert high blood pressure and cholesterol into binary values
        d.HighBP = +d.HighBP;  // Convert to numeric value (0 or 1)
        d.HighChol = +d.HighChol;  // Convert to numeric value (0 or 1)

        // Add DiabetesStatus
        d.DiabetesStatus = diabetesLabels[d.Diabetes_012] || "Unknown";
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

    const corrMargin = { top: 20, right: 30, bottom: 60, left: 100 };
    const corrWidth = 800 - corrMargin.left - corrMargin.right;
    const corrHeight = 800 - corrMargin.top - corrMargin.bottom;

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

    // Call the Sankey function
    createSankeyDiagram(data);
}).catch(function(error) {
    console.error('Error loading or processing CSV file:', error);
});
