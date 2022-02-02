const _ = require('lodash');

module.exports = {
    checkEvent: function (rustplus, client, info, mapMarkers, teamInfo, time) {
        /* Check current time and update time variables */
        module.exports.updateTimeVariables(rustplus, time);
    },

    updateTimeVariables: function (rustplus, time) {
        const sunrise = parseFloat(time.response.time.sunrise.toFixed(2));
        const sunset = parseFloat(time.response.time.sunset.toFixed(2));
        time = parseFloat(time.response.time.time.toFixed(2));

        if (rustplus.firstPoll) {
            rustplus.startTime = time;
            rustplus.previousTime = time;
            rustplus.startTimeObject[time] = 0;
            return;
        }

        let distance;
        if (rustplus.previousTime > time) {
            distance = (24 - rustplus.previousTime) + time;
        }
        else {
            distance = time - rustplus.previousTime;
        }

        if (distance > 1) {
            /* Too big of a jump for a normal server, might have been a skip night server */
            rustplus.log(`Invalid time: distance: ${distance}, previous: ${rustplus.previousTime}, time: ${time}`);
            rustplus.startTime = time;
            rustplus.previousTime = time;
            rustplus.startTimeObject = new Object();
            rustplus.timeTillDay = new Object();
            rustplus.timeTillNight = new Object();
            rustplus.startTimeObject[time] = 0;
            return;
        }

        if (!rustplus.passedFirstSunriseOrSunset) {
            let a = (rustplus.startTime >= sunrise && rustplus.startTime < sunset) &&
                (time >= sunset || time < sunrise);
            let b = (rustplus.startTime >= sunset || rustplus.startTime < sunrise) &&
                (time >= sunrise && time < sunset);

            for (let id of Object.keys(rustplus.startTimeObject)) {
                rustplus.startTimeObject[id] += 10;
            }

            if (a || b) {
                rustplus.passedFirstSunriseOrSunset = true;
            }
            else {
                rustplus.startTimeObject[time] = 0;
                rustplus.previousTime = time;
                return;
            }
        }

        /* If 24 hours in-game time have passed */
        if ((time > rustplus.startTime && rustplus.previousTime < rustplus.startTime) ||
            (time > rustplus.startTime && rustplus.previousTime > time) ||
            (time < rustplus.previousTime && rustplus.startTime > rustplus.previousTime)) {
            rustplus.time24HoursPassed = true;

            /* Merge startTimeObject with correct object */
            let highestValue = 0;
            for (let id of Object.keys(rustplus.startTimeObject)) {
                if (rustplus.startTimeObject[id] > highestValue) {
                    highestValue = rustplus.startTimeObject[id];
                }
            }

            if (rustplus.startTime >= sunrise && rustplus.startTime < sunset) {
                for (let id of Object.keys(rustplus.timeTillNight)) {
                    rustplus.timeTillNight[id] += highestValue;
                }

                rustplus.timeTillNight = _.merge(rustplus.startTimeObject, rustplus.timeTillNight);
            }
            else {
                for (let id of Object.keys(rustplus.timeTillDay)) {
                    rustplus.timeTillDay[id] += highestValue;
                }

                rustplus.timeTillDay = _.merge(rustplus.startTimeObject, rustplus.timeTillDay);
            }

            rustplus.log('24 Successful Hours in-game time have passed.');
            return;
        }

        if (time >= sunrise && time < sunset) {
            /* It's Day */
            /* Increment all values in the object */
            for (let id of Object.keys(rustplus.timeTillNight)) {
                rustplus.timeTillNight[id] += 10;
            }

            rustplus.timeTillNight[time] = 0;
        }
        else {
            /* It's Night */
            /* Increment all values in the object */
            for (let id of Object.keys(rustplus.timeTillDay)) {
                rustplus.timeTillDay[id] += 10;
            }

            rustplus.timeTillDay[time] = 0;
        }

        rustplus.previousTime = time;
    }
}