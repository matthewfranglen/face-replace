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

    var calculateCrop = function (targetBox) {
        return {
            'width': targetBox.width,
            'height': targetBox.height,
            'top': targetBox.y,
            'left': targetBox.x
        };
    };

    var calculateImage = function (sourceImage, sourceBox, targetBox) {
        var widthRatio = targetBox.width / sourceBox.width;
        var heightRatio = targetBox.height / sourceBox.height;

        return {
            'width': sourceImage.width() * widthRatio,
            'height': sourceImage.height() * heightRatio,
            'top': -(sourceBox.y * heightRatio),
            'left': -(sourceBox.x * widthRatio)
        };
    };

    var getImageCanvas = function (image, x, y, width, height) {
        var canvas;

        canvas = angular.element('<canvas/>')[0];
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image[0], -x, -y, width + x, height + y);

        return canvas.getContext('2d');
    };

    var generateAlphaMap = function (canvas, width, height) {
        var imageData, alphaMap, i;

        imageData = canvas.getImageData(0, 0, width, height).data;
        alphaMap = [];
        alphaMap.length = width * height;

        for (i = 0; i < alphaMap.length; i++) {
            alphaMap[i] = imageData[(i * 4) + 3];
        }

        return alphaMap;
    };

    var mostCommonColor = function (canvas, width, height, alphaMap) {
        var imageData, average, count, i, j, alpha;

        imageData = canvas.getImageData(0, 0, width, height).data;

        average = [0, 0, 0];
        count = 0;

        for (i = 0; i < imageData.length; i += 4) {
            alpha = alphaMap[i / 4];
            count += alpha;

            for (j = 0; j < average.length; j++) {
                average[j] += imageData[i + j] * alpha;
            }
        }

        for (i = 0; i < average.length; i++) {
            average[i] /= count;
        }

        return average;
    };

    var replaceFaces = function () {
        var sourceImage = angular.element('#source');
        var sourceBox = faceReplace.sources[0];
        var targetImage = angular.element('#target');

        var replaceFace = function (targetBox) {
            var canvas = getImageCanvas(targetImage, targetBox.x, targetBox.y, targetBox.width, targetBox.height);
            var commonColor = mostCommonColor(canvas, targetBox.width, targetBox.height, faceReplace.alphaMap);
            console.log(commonColor);

            faceReplace.targets.push({
                'crop': calculateCrop(targetBox),
                'img': calculateImage(sourceImage, sourceBox, targetBox)
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

    faceReplace.sources = [];
    faceReplace.targets = [];

    trackFaces('#source', function(trackEvent) {
        trackEvent.data.forEach(function (data) {
            faceReplace.sources.push(data);
        });

        var maskedImage = angular.element('<img src="static/masked-glenn.png" />');
        maskedImage.one('load', function () {
            var sourceBox = faceReplace.sources[0];
            var canvas = getImageCanvas(maskedImage, sourceBox.x, sourceBox.y, sourceBox.width, sourceBox.height);
            faceReplace.alphaMap = generateAlphaMap(canvas, sourceBox.width, sourceBox.height);
            faceReplace.mostCommonColor = mostCommonColor(canvas, sourceBox.width, sourceBox.height, faceReplace.alphaMap);

            console.log(faceReplace.alphaMap);
            console.log(faceReplace.mostCommonColor);
        });

        replaceFaces();
    });
}]);
