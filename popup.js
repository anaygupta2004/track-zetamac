var ctx = document.getElementById('scoreChart').getContext('2d');
var chart;

function loadScores(callback) {
    chrome.storage.local.get(['scores', 'lastReset'], function(result) {
        const today = new Date().toDateString();
        if (result.lastReset !== today) {
            chrome.storage.local.set({scores: [], lastReset: today}, function() {
                console.log('Scores reset for the day.');
                callback([]);
            });
        } else if (result.scores) {
            console.log('Scores loaded:', result.scores);
            callback(result.scores);
        } else {
            console.log('No scores found.');
            callback([]);
        }
    });
}

function updateChart() {
    console.log("updating")
    loadScores(function(scores) {
        const labels = scores.map((_, index) => `Game ${index + 1}`);
        
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets.forEach((dataset) => {
                dataset.data = scores;
            });
            chart.update();
        } else {
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Game Scores',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)', // Light purple background
                        borderColor: 'rgba(153, 102, 255, 1)', // Solid purple line
                        pointBackgroundColor: 'rgba(153, 102, 255, 1)', // Purple points
                        pointBorderColor: '#fff', // White borders for points
                        pointHoverBackgroundColor: '#fff', // White background for point hover
                        pointHoverBorderColor: 'rgba(153, 102, 255, 1)', // Purple borders for point hover
                        data: scores,
                        fill: true, // Fill the area under the line
                        tension: 0.4 // Smoothen the line
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Score',
                                color: '#4e4e4e' // Grey color for the y-axis title to make it subtle
                            },
                            ticks: {
                                color: '#4e4e4e' // Grey color for the y-axis ticks
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Game Number',
                                color: '#4e4e4e' // Grey color for the x-axis title
                            },
                            ticks: {
                                color: '#4e4e4e' // Grey color for the x-axis ticks
                            }
                        }
                    },
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#4e4e4e' // Grey color for the legend labels
                            }
                            
                        }                    }
                }
            });
    
        }
    });
    console.log("updated")
}

document.addEventListener('DOMContentLoaded', function() {
    var resetButton = document.getElementById('resetScores');
    resetButton.addEventListener('click', function() {
        chrome.storage.local.set({scores: [], lastReset: new Date().toDateString()}, function() {
            console.log('Scores have been reset.');
            updateChart();
        });
    });

    updateChart();
});