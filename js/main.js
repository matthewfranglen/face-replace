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
        canvas.getContext('2d').drawImage(image[0], -x, -y, image[0].width, image[0].height);

        return canvas;
    };

    var generateAlphaMap = function (canvas, width, height) {
        var imageData, alphaMap, i;

        imageData = canvas.getContext('2d').getImageData(0, 0, width, height).data;
        alphaMap = [];
        alphaMap.length = width * height;

        for (i = 0; i < alphaMap.length; i++) {
            alphaMap[i] = imageData[(i * 4) + 3];
        }

        return alphaMap;
    };

    var mostCommonColor = function (canvas, width, height, alphaMap) {
        var imageData, average, result, i, key, values, alpha;

        imageData = canvas.getContext('2d').getImageData(0, 0, width, height).data;

        average = {};

        for (i = 0; i < imageData.length; i += 4) {
            values = [imageData[i], imageData[i + 1], imageData[i + 2]];
            alpha = alphaMap[i / 4];

            if (values[0] * values[1] * values[2] < 60 * 60 * 60) {
                continue;
            }

            key = '(' + values[0] + ',' + values[1] + ',' + values[2] + ')';
            if (! average[key]) {
                average[key] = {
                    'values': values,
                    'count': 0
                };
            }
            average[key].count += alpha;
        }

        delete average['(0,0,0)'];
        console.log(average);

        result = null;

        for (key in average) {
            if (result === null) {
                result = average[key];
            }
            else if (result.count < average[key].count) {
                result = average[key];
            }
        }
        console.log(result.count, result.values);

        return result.values;
    };

    var colorMapImage = function (source, sourceAverage, targetAverage) {
        var canvas, context, imageData, offset, i, j, color;

        canvas = getImageCanvas(source, 0, 0, source[0].width, source[0].height);
        context = canvas.getContext('2d');
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        offset = [];
        offset.length = 3;
        for (i = 0; i < 3; i++) {
            offset[i] = targetAverage[i] - sourceAverage[i];
        }

        for (i = 0; i < imageData.data.length; i += 4) {
            for (j = 0; j < 3; j++) {
                color = imageData.data[i + j] + offset[j];
                color = color === 0
                      ? 0
                      : color > 255
                      ? 255
                      : color;
                imageData.data[i + j] = color;
            }
        }

        context.putImageData(imageData, 0, 0);

        return canvas.toDataURL('image/png');
    };

    var replaceFaces = function () {
        var sourceImage = angular.element('#source');
        var sourceBox = faceReplace.sources[0];
        var targetImage = angular.element('#target');

        var replaceFace = function (targetBox) {
            var canvas = getImageCanvas(targetImage, targetBox.x, targetBox.y, targetBox.width, targetBox.height);
            var commonColor = mostCommonColor(canvas, targetBox.width, targetBox.height, faceReplace.alphaMap);
            var mappedImageUrl = colorMapImage(faceReplace.maskedImage, faceReplace.mostCommonColor, commonColor);

            faceReplace.targets.push({
                'crop': calculateCrop(targetBox),
                'img': calculateImage(sourceImage, sourceBox, targetBox),
                'src': mappedImageUrl
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

        faceReplace.maskedImage = angular.element('<img src="static/masked-glenn.png" />');
        faceReplace.maskedImage.one('load', function () {
            var sourceBox = faceReplace.sources[0];
            var canvas = getImageCanvas(faceReplace.maskedImage, sourceBox.x, sourceBox.y, sourceBox.width, sourceBox.height);
            faceReplace.alphaMap = generateAlphaMap(canvas, sourceBox.width, sourceBox.height);
            faceReplace.mostCommonColor = mostCommonColor(canvas, sourceBox.width, sourceBox.height, faceReplace.alphaMap);

            replaceFaces();
        });
    });
}]);
