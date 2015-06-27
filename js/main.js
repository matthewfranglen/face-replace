/*jslint browser: true*/
/*global angular, tracking*/
angular.module('faceReplaceApp', [])
       .controller('FaceReplaceController', ['$scope', function($scope) {

    var faceReplace = this;
    var video = document.getElementById('video');
    var tracker = new tracking.ObjectTracker('face');

    faceReplace.faces = [];

    tracking.track(video, tracker);

    var clearFaces = function() {
        faceReplace.faces.length = 0;
    };
    var addFace = function(face) {
        faceReplace.faces.push({
            'top': face.y,
            'left': face.x,
            'width': face.width,
            'height': face.height
        });
        console.log(faceReplace.faces);
    };
    var handleTrackEvent = function(trackEvent) {
        console.log(trackEvent);
        clearFaces();
        trackEvent.data.forEach(addFace);
        $scope.$apply();
    };

    tracker.on('track', handleTrackEvent);

    console.log('Configured');
}]);
