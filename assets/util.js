function loadSVG() {
    $.ajax({
        url: 'http://' + window.location.host + "/worldmap.html",
        headers: { 'Access-Control-Allow-Origin': 'null' },
        type: "GET",
        async: false,
        contentType: "text/plain",
        success: function(data) {
            $('.mapContainer').append(data);
            panzoom($('#worldMap')[0], {
				minZoom: 0.5,
				bounds: true,
  				boundsPadding: 0.1
			});
            $('.country').on('mouseover', function(){
                
            });
        }
     });
}

function registerCountryClick() {
    var longpress = 300;
	var start;

	$('.country').on( 'mousedown touchstart', function( e ) {
	    start = new Date().getTime();
	});
    
	$('.country').on( 'mouseleave', function( e ) {
        start = 0;
	});
	
	$('.country').on( 'touchmove', function( e ) {
        start = 0;
    });
    
	$('.country').on( 'mouseup touchend', function( e ) {
	    if ( new Date().getTime() >= ( start + longpress )  ) {
	        
	    } else {
            $('.country').removeClass('active');
            $(this).addClass('active');
            $('#chart_id').empty();
            let countryId = $(this).attr('id');
            let url = "https://covid19-api.org/api/timeline/";
            let countryTitle = $(this).attr('title');
            url += countryId;
            loadData(url, countryTitle);
		}
		start = 0;
	});
    $('.country').on('mouseover', function(){
		let countryTitle = $(this).attr('title');
		$('.highlightedCountry').text(countryTitle);
	});
	$('.country').on('mouseout', function(){
        $('.highlightedCountry').empty();
    });
}

function loadData(url, countryTitle) {
    var primaryArray = [];
	var activeCasesArray = [];
	var modelArray = [];
	var newActiveCasesArray = [];
	var lastTenDayValues = [];
	var nextTenDayPredictions = [];
	var twentyDayPredictions = [];
	let nextTenthDayActiveCount;
	let predictionDelta;
	$.get(url, function (data) {
		primaryArray = data;
		loadStats(primaryArray);
		$.each(primaryArray, function (index, value) {
			activeCasesArray.push(value.cases - (value.deaths + value.recovered));
		});
		console.log(activeCasesArray);
		const model = tf.sequential();
		model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
		// model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
		model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
		var indexArray = [];
		// activeCasesArray.sort(function (a, b) {
		// 	return a - b;
		// });
		activeCasesArray.reverse();
		$.each(activeCasesArray, function (index, value) {
			indexArray.push(index + 1);
			newActiveCasesArray.push(value);
		});
        lastTenDayValues = newActiveCasesArray.slice(newActiveCasesArray.length - 15);

        let stageLength = newActiveCasesArray.length / 15;
        // lastTenDayValues = constructReducedBatch(newActiveCasesArray, stageLength);


		const xs = tf.tensor2d([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [15, 1]);
		const ys = tf.tensor2d(lastTenDayValues, [15, 1]);
		model.fit(xs, ys, { epochs: 1000, shuffle: true}).then(() => {
			// $.each(activeCasesArray, function (index, value) {

			// });
			for (i = 0; i < 20; i++) {
				//model.predict(tf.tensor2d([newActiveCasesArray.length+10], [1, 1])).print();
				let predictedValue = model.predict(tf.tensor2d([lastTenDayValues.length + (i + 1)], [1, 1])).dataSync()[0];
				predictedValue = parseInt('' + predictedValue + '');
				console.log(predictedValue);
				nextTenDayPredictions.push(predictedValue);
			}
			var fullLength = newActiveCasesArray.length - 1;
			$.each(newActiveCasesArray, function (index, value) {
				twentyDayPredictions.push([(index - fullLength).toString(), value]);
			});
			$.each(nextTenDayPredictions, function (index, value) {
				twentyDayPredictions.push([(index + 1).toString(), value]);
			});
			// twentyDayPredictions.unshift(['Day', 'Predicted Number']);
			google.charts.load('current', { 'packages': ['corechart', 'line'] });
			google.charts.setOnLoadCallback(drawChart);
			function drawChart() {
				var data = new google.visualization.DataTable();
				data.addColumn('string', 'X');
				data.addColumn('number', 'Cases');
				data.addRows(twentyDayPredictions);

				var options = {
					title: 'Active case count and prediction for the next ten days',
					hAxis: { title: 'Days' },
					vAxis: { title: 'Case count' },
					legend: 'none',
					height: 500,
					// trendlines: { 0: {} }    // Draw a trendline for data series 0.
				};

				var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
				// chart.draw(data, options);
				chart.draw(data, google.charts.Line.convertOptions(options));
			}
			predictionDelta = nextTenDayPredictions[9] - lastTenDayValues[lastTenDayValues.length-1];

			if(predictionDelta > 0) {
				$('.nextTenthDayActiveCount').next().show();
				$('.nextTenthDayActiveCount').next().next().hide();
			}
			else {
				$('.nextTenthDayActiveCount').next().hide();
				$('.nextTenthDayActiveCount').next().next().show();
			}

			$('.countryLabel').text(countryTitle);
			$('.nextTenthDayActiveCount').text(numberWithCommas(nextTenDayPredictions[9]));
		});
		// console.log(modelArray);
	});
}

function constructReducedBatch(newActiveCasesArray, stageLength) {
    let lastTenDayValues = [];
    for(stage=1; stage<=15; stage++){
        // let currentStage = parseInt(stage * stageLength);
        let currentStage = newActiveCasesArray.length - (stage * 2)
        lastTenDayValues.push(newActiveCasesArray[currentStage]);
    }
    return lastTenDayValues;
}

function loadStats(primaryArray) {
	let countryTotalConfirmedCases = 0;
	let countryTotalActiveCases = 0;
	let countryTotalDeaths = 0;
	let countryNewCases = 0;
	let countryNewDeaths = 0;
	let countryNewRecoveries = 0;
	let lastTenDayDifference = 0;
	let countryTotalRecoveries = 0;
	let lastTenDayRecoveryDifference = 0;
	let overallTrend = ['Negative', 'Neutral', 'Positive'];
	let recoveryPercentage;
	let newCasePercentage;
	let activeCasesDelta;
	
	countryTotalConfirmedCases = primaryArray[0].cases;
	countryTotalActiveCases = primaryArray[0].cases - (primaryArray[0].deaths + primaryArray[0].recovered);
	countryTotalDeaths = primaryArray[0].deaths;
	countryTotalRecoveries = primaryArray[0].recovered;
	countryNewCases = primaryArray[0].cases - primaryArray[1].cases;
	lastTenDayDifference = primaryArray[0].cases - primaryArray[9].cases;
	countryNewDeaths = primaryArray[0].deaths - primaryArray[1].deaths;
	lastTenDayRecoveryDifference = primaryArray[0].recovered - primaryArray[9].recovered;
	countryNewRecoveries = primaryArray[0].recovered - primaryArray[1].recovered;
	activeCasesDelta = countryTotalActiveCases - (primaryArray[1].cases - (primaryArray[1].deaths + primaryArray[1].recovered));

	recoveryPercentage = countryTotalRecoveries / primaryArray[9].recovered;
	newCasePercentage = countryTotalConfirmedCases / primaryArray[9].cases;

	$('.controlPlaceholder').hide();
	$('.controlUnit').fadeIn();

	$('.countryTotalConfirmedCases').text(numberWithCommas(countryTotalConfirmedCases));
	$('.countryTotalActiveCases').text(numberWithCommas(countryTotalActiveCases));
	$('.countryTotalDeaths').text(numberWithCommas(countryTotalDeaths));
	$('.countryTotalRecoveries').text(numberWithCommas(countryTotalRecoveries));
	$('.countryNewCases').text(numberWithCommas(countryNewCases));
	$('.lastTenDayDifference').text(numberWithCommas(lastTenDayDifference));

	if(countryNewDeaths <= 0) {
		countryNewDeaths = primaryArray[1].deaths - primaryArray[2].deaths;
		$('.countryNewDeathsLabel').text('new deaths last day as data for today is available');
		// $('.countryTotalDeaths').next().show();
		// $('.countryTotalDeaths').next().next().hide();
	}
	else {
		$('.countryNewDeathsLabel').text('new deaths today');
		$('.countryTotalDeaths').next().show();
		$('.countryTotalDeaths').next().next().hide();
	}
	$('.countryNewDeaths').text(numberWithCommas(countryNewDeaths));

	if(countryNewCases >= 0) {
		$('.countryTotalConfirmedCases').next().show();
		$('.countryTotalConfirmedCases').next().next().hide();
	}
	else {
		$('.countryTotalConfirmedCases').next().hide();
		$('.countryTotalConfirmedCases').next().next().show();
	}

	if(countryNewRecoveries >= 0) {
		$('.countryTotalRecoveries').next().show();
		$('.countryTotalRecoveries').next().next().hide();
	}
	else {
		$('.countryTotalRecoveries').next().hide();
		$('.countryTotalRecoveries').next().next().show();
	}

	if(activeCasesDelta >= 0) {
		$('.countryTotalActiveCases').next().show();
		$('.countryTotalActiveCases').next().next().hide();
	}
	else {
		$('.countryTotalActiveCases').next().hide();
		$('.countryTotalActiveCases').next().next().show();
	}

	$('.overallTrend').removeClass('positive').removeClass('negative').removeClass('neutral');
	if(recoveryPercentage > 1 && recoveryPercentage > newCasePercentage) {
		$('.overallTrend').text(overallTrend[2]);
		$('.overallTrend').addClass('positive');
	}
	else if(newCasePercentage <= 1.05) {
		$('.overallTrend').text(overallTrend[1]);
		$('.overallTrend').addClass('neutral');
	}
	else {
		$('.overallTrend').text(overallTrend[0]);
		$('.overallTrend').addClass('negative');
	}
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}