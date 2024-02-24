var ctx = document.getElementById('scoreChart').getContext('2d');

var chart;

function loadScores(callback) {
    chrome.storage.local.get(['scores'], function(result) {
        if (result.scores) {
            console.log('Scores loaded:', result.scores);
            callback(result.scores);
        } else {
            console.log('No scores found.');
            callback([]);
        }
    });
}
function updateChart() {
    
    loadScores(function(scores) {
        const labels = scores.map((_, index) => `Game ${index + 1}`);
        
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets.forEach((dataset) => {
                dataset.data = scores;
            });
            chart.update();
        } else {
            var ctx = document.getElementById('scoreChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Game Scores',
                        backgroundColor: 'rgb(255, 99, 132)',
                        borderColor: 'rgb(255, 99, 132)',
                        data: scores,
                        fill: false,
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Score'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Game Number'
                            }
                        }
                    },
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Your Game Scores Over Time'
                        }
                    }
                }
            });
        }
    });
}
updateChart();

