// Constants for the health indicators and diabetes labels
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

// Pearson correlation function
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

// Add node selection controls
function createNodeSelectionControls() {
    // Create container for selection controls
    const controlPanel = document.createElement('div');
    controlPanel.className = 'node-selection-controls';
    controlPanel.innerHTML = `
        <h3>Select Health Indicators</h3>
        <div class="selection-container">
            <div class="selection-group">
                <input type="checkbox" id="bmi-checkbox" class="indicatorCheck" value="BMI" checked>
                <label for="bmi-checkbox">BMI</label>
                
                <input type="checkbox" id="bp-checkbox" class="indicatorCheck" value="HighBP" checked>
                <label for="bp-checkbox">Blood Pressure</label>
                
                <input type="checkbox" id="chol-checkbox" class="indicatorCheck" value="HighChol" checked>
                <label for="chol-checkbox">Cholesterol</label>
            </div>
            <div class="selection-group">
                <input type="checkbox" id="health-checkbox" class="indicatorCheck" value="GenHlth">
                <label for="health-checkbox">General Health</label>
                
                <input type="checkbox" id="age-checkbox" class="indicatorCheck" value="Age">
                <label for="age-checkbox">Age</label>
                
                <input type="checkbox" id="sex-checkbox" class="indicatorCheck" value="Sex">
                <label for="sex-checkbox">Gender</label>
            </div>
        </div>
        <button id="updateSankeyBtn">Update Diagram</button>
    `;
    
    // Insert controls before the Sankey container
    const sankeyContainer = document.getElementById('sankeyPlotContainer');
    sankeyContainer.appendChild(controlPanel);
    
    // Create tooltip div if it doesn't exist
    if (!document.getElementById("sankeyTooltip")) {
        const tooltip = document.createElement('div');
        tooltip.id = "sankeyTooltip";
        tooltip.className = "tooltip";
        tooltip.style.opacity = 0;
        document.body.appendChild(tooltip);
    }
    
    // Create tooltip div for correlation matrix if it doesn't exist
    if (!document.getElementById("corrTooltip")) {
        const corrTooltip = document.createElement("div");
        corrTooltip.id = "corrTooltip";
        corrTooltip.style.visibility = "hidden";
        document.body.appendChild(corrTooltip);
    }
    
    // Add event listener for the update button
    document.getElementById('updateSankeyBtn').addEventListener('click', function() {
        updateSankeyWithSelection();
    });
}

// Update Sankey diagram based on selected indicators
function updateSankeyWithSelection() {
    // Get all selected indicators
    const selectedIndicators = [];
    document.querySelectorAll('.indicatorCheck:checked').forEach(checkbox => {
        selectedIndicators.push(checkbox.value);
    });
    
    // Validate selection
    if (selectedIndicators.length === 0) {
        alert('Please select at least one health indicator.');
        return;
    }
    
    // Load and process data with selected indicators
    d3.csv("data.csv").then(function(data) {
        // Sample a subset for better performance
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

            // Convert other indicators to numbers
            d.HighBP = +d.HighBP;
            d.HighChol = +d.HighChol;
            d.GenHlth = +d.GenHlth;
            d.Sex = +d.Sex;  
            d.Age = +d.Age;

            // Add DiabetesStatus
            d.DiabetesStatus = diabetesLabels[d.Diabetes_012] || "Unknown";
        });
        
        createEnhancedSankeyDiagram(data, selectedIndicators);
    }).catch(function(error) {
        console.error('Error loading or processing CSV file:', error);
    });
}

// Enhanced Sankey diagram with selected indicators
function createEnhancedSankeyDiagram(data, selectedIndicators) {
    console.log("Creating enhanced Sankey diagram with", data.length, "data points");
    console.log("Selected indicators:", selectedIndicators);
    
    // Clear previous visualization
    d3.select("#sankeyPlotContainer").select("svg").remove();
    
    // Define the dimensions of the Sankey diagram
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = 730;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG element
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
        // Initialize nodes array with diabetes status nodes
        const nodes = [
            { name: "No Diabetes" },
            { name: "Prediabetic" },
            { name: "Diabetic" }
        ];
        
        // Add nodes for selected indicators
        let nodeIndex = 3;
        const indicatorNodeIndices = {};
        
        // For BMI indicator
        if (selectedIndicators.includes("BMI")) {
            nodes.push({ name: "Low BMI" });
            nodes.push({ name: "Normal BMI" });
            nodes.push({ name: "High BMI" });
            indicatorNodeIndices.BMI = { 
                low: nodeIndex, 
                normal: nodeIndex + 1, 
                high: nodeIndex + 2 
            };
            nodeIndex += 3;
        }
        
        // For HighBP indicator
        if (selectedIndicators.includes("HighBP")) {
            nodes.push({ name: "No HighBP" });
            nodes.push({ name: "Has HighBP" });
            indicatorNodeIndices.HighBP = { 
                no: nodeIndex, 
                yes: nodeIndex + 1 
            };
            nodeIndex += 2;
        }
        
        // For HighChol indicator
        if (selectedIndicators.includes("HighChol")) {
            nodes.push({ name: "No HighChol" });
            nodes.push({ name: "Has HighChol" });
            indicatorNodeIndices.HighChol = { 
                no: nodeIndex, 
                yes: nodeIndex + 1 
            };
            nodeIndex += 2;
        }
        
        // For GenHlth indicator
        if (selectedIndicators.includes("GenHlth")) {
            nodes.push({ name: "Excellent Health" });
            nodes.push({ name: "Very Good Health" });
            nodes.push({ name: "Good Health" });
            nodes.push({ name: "Fair Health" });
            nodes.push({ name: "Poor Health" });
            indicatorNodeIndices.GenHlth = { 
                1: nodeIndex, 
                2: nodeIndex + 1,
                3: nodeIndex + 2,
                4: nodeIndex + 3,
                5: nodeIndex + 4
            };
            nodeIndex += 5;
        }
        
        // For Sex indicator
        if (selectedIndicators.includes("Sex")) {
            nodes.push({ name: "Female" });
            nodes.push({ name: "Male" });
            indicatorNodeIndices.Sex = { 
                0: nodeIndex, 
                1: nodeIndex + 1 
            };
            nodeIndex += 2;
        }
        
        // For Age indicator
        if (selectedIndicators.includes("Age")) {
            nodes.push({ name: "Young (18-39)" });
            nodes.push({ name: "Middle (40-59)" });
            nodes.push({ name: "Senior (60+)" });
            indicatorNodeIndices.Age = { 
                young: nodeIndex, 
                middle: nodeIndex + 1, 
                senior: nodeIndex + 2 
            };
            nodeIndex += 3;
        }

        // Create a map to count links between nodes
        const linkMap = {};

        // Function to add or increment a link
        const addLink = (source, target) => {
            // Skip invalid indices
            if (source < 0 || target < 0 || source >= nodes.length || target >= nodes.length) {
                return;
            }
            
            const key = `${source}-${target}`;
            if (!linkMap[key]) {
                linkMap[key] = { source, target, value: 0 };
            }
            linkMap[key].value += 1;
        };

        // Count the data for each group and create links
        data.forEach(d => {
            // Get the diabetes status index (0, 1, or 2)
            const diabetesStatusIndex = d.Diabetes_012;
            
            // Add links for BMI if selected
            if (selectedIndicators.includes("BMI")) {
                let bmiNodeIndex;
                if (d.BMI < 25) bmiNodeIndex = indicatorNodeIndices.BMI.low;
                else if (d.BMI < 30) bmiNodeIndex = indicatorNodeIndices.BMI.normal;
                else bmiNodeIndex = indicatorNodeIndices.BMI.high;
                
                addLink(diabetesStatusIndex, bmiNodeIndex);
            }
            
            // Add links for HighBP if selected
            if (selectedIndicators.includes("HighBP")) {
                const highBPNodeIndex = d.HighBP === 0 ? 
                    indicatorNodeIndices.HighBP.no : 
                    indicatorNodeIndices.HighBP.yes;
                    
                addLink(diabetesStatusIndex, highBPNodeIndex);
            }
            
            // Add links for HighChol if selected
            if (selectedIndicators.includes("HighChol")) {
                const highCholNodeIndex = d.HighChol === 0 ? 
                    indicatorNodeIndices.HighChol.no : 
                    indicatorNodeIndices.HighChol.yes;
                    
                addLink(diabetesStatusIndex, highCholNodeIndex);
            }
            
            // Add links for GenHlth if selected
            if (selectedIndicators.includes("GenHlth")) {
                const genHlthNodeIndex = indicatorNodeIndices.GenHlth[d.GenHlth];
                if (genHlthNodeIndex !== undefined) {
                    addLink(diabetesStatusIndex, genHlthNodeIndex);
                }
            }
            
            // Add links for Sex if selected
            if (selectedIndicators.includes("Sex")) {
                const sexNodeIndex = indicatorNodeIndices.Sex[d.Sex];
                if (sexNodeIndex !== undefined) {
                    addLink(diabetesStatusIndex, sexNodeIndex);
                }
            }
            
            // Add links for Age if selected
            if (selectedIndicators.includes("Age")) {
                let ageNodeIndex;
                if (d.Age < 7) ageNodeIndex = indicatorNodeIndices.Age.young;
                else if (d.Age < 11) ageNodeIndex = indicatorNodeIndices.Age.middle;
                else ageNodeIndex = indicatorNodeIndices.Age.senior;
                
                addLink(diabetesStatusIndex, ageNodeIndex);
            }
        });

        // Convert the linkMap to an array of links
        const links = Object.values(linkMap);
        
        // Check if we have any links
        if (links.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("fill", "#666")
                .text("No connections found with the selected indicators.");
            return;
        }
        
        // Set up Sankey diagram generator
        const sankey = d3.sankey()
            .nodeWidth(20)
            .nodePadding(40) // Increased padding to reduce overlap
            .size([width, height]);
            
        // Create graph structure with nodes and links
        const graph = { 
            nodes: nodes.map(d => Object.assign({}, d)), 
            links: links.map(d => Object.assign({}, d))
        };
            
        // Compute positions
        sankey(graph);
        
        // Get the path generator
        const sankeyLink = d3.sankeyLinkHorizontal();
        
        // Access tooltip
        const tooltip = d3.select("#sankeyTooltip");
        
        // Draw the links (flows)
        svg.append("g")
            .selectAll("path")
            .data(graph.links)
            .enter()
            .append("path")
            .attr("d", sankeyLink)
            .attr("stroke", d => {
                // Color links based on source node (diabetes status)
                if (d.source.index === 0) return "#3498db"; // No Diabetes
                if (d.source.index === 1) return "#f39c12"; // Prediabetic
                if (d.source.index === 2) return "#e74c3c"; // Diabetic
                return "#aaa";
            })
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("fill", "none")
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                // Highlight this link
                d3.select(this)
                    .attr("opacity", 0.9);
                
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="font-weight: bold; margin-bottom: 5px;">${d.source.name} → ${d.target.name}</div>
                        <div>Count: <strong>${d.value}</strong> patients</div>
                        <div>Percentage: <strong>${(d.value / d3.sum(graph.links, l => l.value) * 100).toFixed(1)}%</strong></div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                // Reset link opacity
                d3.select(this)
                    .attr("opacity", 0.7);
                
                tooltip.style("opacity", 0);
            });

        // Draw the nodes with colors based on their category
        const nodeColor = d => {
            // Color nodes based on their category
            if (d.index <= 2) return "#3498db"; // Diabetes status
            return "#1abc9c"; // Health indicators
        };
        
        const node = svg.append("g")
            .selectAll("rect")
            .data(graph.nodes)
            .enter()
            .append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", nodeColor)
            .attr("stroke", "#000")
            .on("mouseover", function(event, d) {
                // Highlight connected links
                svg.selectAll("path")
                    .attr("opacity", l => 
                        l.source.index === d.index || l.target.index === d.index ? 0.9 : 0.2
                    );
                
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="font-weight: bold; margin-bottom: 5px;">${d.name}</div>
                        <div>Count: <strong>${d.value}</strong> patients</div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                // Reset link opacity
                svg.selectAll("path")
                    .attr("opacity", 0.7);
                
                tooltip.style("opacity", 0);
            });

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

// Function to create the correlation matrix with legend
function createCorrelationMatrix(data) {
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

    const corrMargin = { top: 20, right: 30, bottom: 120, left: 100 }; // Increased bottom margin for legend
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

    // Clear existing SVG
    d3.select("#corrMatrixContainer svg").remove();

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

    // Get tooltip
    const corrTooltip = d3.select("#corrTooltip");

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
                    <div style="font-weight: bold; margin-bottom: 5px;">${d.x} vs ${d.y}</div>
                    <div>Correlation: <span style="color:${d.value > 0 ? '#2563eb' : '#dc2626'}">${d.value.toFixed(2)}</span></div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">
                        ${Math.abs(d.value) > 0.7 ? 'Strong correlation' : 
                          Math.abs(d.value) > 0.4 ? 'Moderate correlation' : 
                          Math.abs(d.value) > 0.2 ? 'Weak correlation' : 'Very weak correlation'}
                    </div>
                `)
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
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
        .style("fill", d => Math.abs(d.value) > 0.4 ? "#fff" : "#000")
        .style("font-size", "10px")
        .text(d => d.value.toFixed(2));

    // Title
    svgCorrHeatmap.append("text")
        .attr("x", corrWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Correlation Matrix: Health Indicators + Diabetes Status");
    
    // Add correlation legend
    addCorrelationLegend(svgCorrHeatmap, corrWidth, corrHeight);
}

// Add a color legend for the correlation matrix
function addCorrelationLegend(svgCorrHeatmap, width, height) {
    // Define the legend dimensions and position
    const legendWidth = 300;
    const legendHeight = 60;
    const legendX = (width - legendWidth) / 2;
    const legendY = height + 40;
    
    // Create a group for the legend
    const legend = svgCorrHeatmap.append("g")
        .attr("class", "correlation-legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    
    // Create a linear gradient for the color scale
    const defs = svgCorrHeatmap.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "correlation-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    
    // Add color stops to the gradient
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.interpolateRdBu(0)); // Red for -1
    
    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", d3.interpolateRdBu(0.5)); // White for 0
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.interpolateRdBu(1)); // Blue for 1
    
    // Add the colored rectangle using the gradient
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", 15)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("fill", "url(#correlation-gradient)");
    
    // Add axis for the legend
    const legendScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range([0, legendWidth / 2, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
        .tickValues([-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1])
        .tickFormat(d3.format(".2f"));
    
    legend.append("g")
        .attr("transform", `translate(0, 15)`)
        .call(legendAxis);
    
    // Add title
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Correlation Coefficient");
    
    // Add description
    legend.append("text")
        .attr("x", 0)
        .attr("y", 45)
        .attr("text-anchor", "start")
        .style("font-size", "11px")
        .text("Strong Negative");
    
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text("No Correlation");
    
    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", 45)
        .attr("text-anchor", "end")
        .style("font-size", "11px")
        .text("Strong Positive");
}

// Initialize both visualizations
function initVisualizations() {
    // Create node selection controls
    createNodeSelectionControls();
    
    // Load and process CSV data
    d3.csv("data.csv").then(function(data) {
        // Sample a random subset of 1000 records for better performance
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
            d.GenHlth = +d.GenHlth;
            d.Sex = +d.Sex;  
            d.Age = +d.Age;

            // Add DiabetesStatus
            d.DiabetesStatus = diabetesLabels[d.Diabetes_012] || "Unknown";
        });

        // Call the enhanced Sankey function instead of the original
        createEnhancedSankeyDiagram(data, ["BMI", "HighBP", "HighChol"]);
        
        // Create the correlation matrix with legend
        createCorrelationMatrix(data);
    }).catch(function(error) {
        console.error('Error loading or processing CSV file:', error);
        
        // Display error message on the page
        const container = document.getElementById("sankeyPlotContainer");
        container.innerHTML += `
            <div style="color: red; padding: 20px;">
                <h3>Error Loading Data</h3>
                <p>Could not load the data file. Please check the console for details.</p>
                <p>Error: ${error.message}</p>
            </div>
        `;
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initVisualizations);

// Mobile menu toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const menu = document.querySelector('#mobile-menu');
    const menuLinks = document.querySelector('.navbar__menu');
    
    if (menu && menuLinks) {
        menu.addEventListener('click', function() {
            menu.classList.toggle('is-active');
            menuLinks.classList.toggle('active');
        });
    }
});
