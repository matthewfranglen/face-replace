/*jslint browser: true*/
/*global angular, tracking*/
angular.module('faceReplaceApp', [])
.controller('FaceReplaceController', ['$scope', function($scope) {
    var faceReplace = this;

    var trackFaces = function (target, callback) {
        var tracker = new tracking.ObjectTracker('face');
        tracking.track(target, tracker);
        tracker.on('track', callback);
    };

    var replaceFaces = function () {
        var replaceFace = function (face) {
            faceReplace.targets.push({
                'top': face.y,
                'left': face.x,
                'width': face.width,
                'height': face.height
            });
        };

        trackFaces('#target', function (trackEvent) {
            if (faceReplace.sources.length === 0) {
                console.log("No faces detected in source image...");
                return;
            }

            trackEvent.data.forEach(replaceFace);
            $scope.$apply();
        });
    };

    faceReplace.sourceImage = "static/glenn.jpg";
    faceReplace.sources = [];
    faceReplace.targets = [];

    trackFaces('#source', function(trackEvent) {
        trackEvent.data.forEach(function (data) { faceReplace.sources.push(data); });
        replaceFaces();
    });

    console.log('Configured');
}]);
