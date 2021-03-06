/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * A Curve instance represents a curve in a graph. A graph can contain multiple
 * curves.
 * @constructor
 *
 * @param {string} name The name of this curve.
 * @param {!Array<!Object>} data The data points for this curve.
 * @param {!Function} getXValueFn The function to use for extracting the x-axis
 *     value from a data point.
 * @param {!Function} getYValueFn The function to use for extracting the y-axis
 *     value from a data point.
 */
var Curve = function(name, data, getXValueFn, getYValueFn) {
  this.name = name;
  this.data = data;
  this.getXValue = getXValueFn;
  this.getYValue = getYValueFn;

  this.color = null;
};


/**
 * An array of exactly two elements, representing minimum and maximum value
 * respectively.
 * @typedef {!Array}
 */
Curve.Domain_;


/**
 * @return {!Curve.Domain_} The domain of the X-axis.
 */
Curve.prototype.getXDomain = function() {
  return d3.extent(this.data, this.getXValue);
};


/**
 * @return {!Curve.Domain_} The domain of the Y-axis.
 */
Curve.prototype.getYDomain = function() {
  return d3.extent(this.data, this.getYValue);
};


/**
 * Draws this Curve.
 * @param {!d3.selection} svg The SVG container.
 * @param {!d3.axisType} xAxis
 * @param {!d3.axisType} yAxis
 */
Curve.prototype.draw = function(svg, xAxis, yAxis) {
  var getScaledXValue = (function(d) {
    return xAxis(this.getXValue(d));
  }.bind(this));
  var getScaledYValue = (function(d) {
    return yAxis(this.getYValue(d));
  }.bind(this));

  this.drawDataLine_(svg, getScaledXValue, getScaledYValue);
  this.drawDataPoints_(svg, getScaledXValue, getScaledYValue);
};


/**
 * Draws the data line.
 * @param {!d3.selection} svg The SVG container.
 * @param {function(Object): number} getScaledXValue
 * @param {function(Object): number} getScaledYValue
 * @private
 */
Curve.prototype.drawDataLine_ = function(
    svg, getScaledXValue, getScaledYValue) {
  // Define the line
  var line = d3.svg.line().
      x(getScaledXValue).
      y(getScaledYValue);

  // Draw the data curve.
  svg.append('path').
      attr('class', 'curve-' + this.color).
      attr('d', line(this.data));
};


/**
 * Draws the data points.
 * @param {!d3.selection} svg The SVG container.
 * @param {function(Object): number} getScaledXValue
 * @param {function(Object): number} getScaledYValue
 * @private
 */
Curve.prototype.drawDataPoints_ = function(
    svg, getScaledXValue, getScaledYValue) {
  var dataPointsOverlay = svg.append('g').
      attr('class', 'data-points-overlay');
  this.data.forEach(function(d) {
    dataPointsOverlay.append('circle').
        attr('r', 2.0).
        attr(
            'transform',
            'translate(' + getScaledXValue(d) + ',' + getScaledYValue(d) + ')');
  }, this);
};



/**
 * A class to be used for drawing a graph. A graph can contain multiple Curves.
 * @constructor
 *
 * @param {!HTMLElement} containerEl
 */
var GraphPlotter = function(containerEl) {
  this.containerEl_ = containerEl;

  var minWidth = 500;
  this.totalWidth = Math.max(minWidth, containerEl.scrollWidth - 100);
  this.totalHeight = 270;
  this.margin = {top: 0, right: 20, bottom: 30, left: 50};

  /** @private {!d3.axisType} */
  this.x_ = d3.time.scale().range([0, this.getWidth_()]);

  /** @private {!d3.axisType} */
  this.y_ = d3.scale.linear().range([this.getHeight_(), 0]);

  /**
   * The curves that are included in this graph.
   * @private {!Map<string, Curve>}
   */
  this.curves_ = new Map();
};


/**
 * CSS colors to be used for multi-line graphs.
 * @private {!Array<string>}
 */
GraphPlotter.CURVE_COLORS_ = ['red', 'green', 'blue', 'violet', 'cyan'];


/**
 * Adds a curve to this graph.
 * @param {!Curve} curve
 */
GraphPlotter.prototype.addCurve = function(curve) {
  curve.color = GraphPlotter.CURVE_COLORS_[this.curves_.size];
  this.curves_.set(curve.name, curve);
};


/**
 * @return {number}
 * @private
 */
GraphPlotter.prototype.getWidth_ = function() {
  return this.totalWidth - this.margin.left - this.margin.right;
};


/**
 * @return {number}
 * @private
 */
GraphPlotter.prototype.getHeight_ = function() {
  return this.totalHeight - this.margin.top - this.margin.bottom;
};


/**
 * Finds the domain of an axis, by looking through all the curves that have been
 * added to this graph.
 * @param {!function(Curve):!Curve.Domain_} curveDomainFn
 * @return {!Curve.Domain_}
 * @private
 */
GraphPlotter.prototype.getDomain_ = function(curveDomainFn) {
  var min = null;
  var max = null;
  this.curves_.forEach(function(curve, curveName) {
    var curveDomain = curveDomainFn(curve);
    if (min == null || curveDomain[0] < min) {
      min = curveDomain[0];
    }

    if (max == null || curveDomain[1] > max) {
      max = curveDomain[1];
    }
  }, this);
  return [min, max];
};


/**
 * Updates the domain of the X-axis, considering all curves that have been added
 * to this graph.
 * added to this graph.
 * @private
 */
GraphPlotter.prototype.updateXDomain_ = function() {
  this.x_.domain(this.getDomain_(function(curve) {
    return curve.getXDomain();
  }));
};


/**
 * Updates the domain of the Y-axis, considering all curves that have been added
 * to this graph.
 * added to this graph.
 * @private
 */
GraphPlotter.prototype.updateYDomain_ = function() {
  var yDomain = this.getDomain_(function(curve) {
    return curve.getYDomain();
  });

  // Extending the y-domain in each direction respectively (makes the graph look
  // nicer, by leaving some buffer between the min and max points and the
  // boundary of the drawing area.
  var extendYPercent = 1.05;

  // For the case where many curves exist, need to extend even more to have some
  // space for drawing the legend.
  if (this.curves_.size > 1 && this.curves_.size < 3) {
    extendYPercent = 1.15;
  } else if (this.curves_.size > 3) {
    extendYPercent = 1.25;
  }

  this.y_.domain([
    Math.floor(yDomain[0] * 0.97),
    Math.ceil(yDomain[1] * extendYPercent)
  ]);
};


/**
 * Draws the graph.
 */
GraphPlotter.prototype.draw = function() {
  if (this.curves_.size == 0) {
    return;
  }

  this.updateXDomain_();
  this.updateYDomain_();

  var svg = d3.select(this.containerEl_).
      append('svg').
      attr('width', this.totalWidth).
      attr('height', this.totalHeight).
      append('g').
      attr(
          'transform',
          'translate(' + this.margin.left + ',' + this.margin.top + ')');

  this.drawGrid_(svg);
  this.drawAxes_(svg);
  this.drawLegend_(svg);
  this.curves_.forEach(function(curve, curveName) {
    curve.draw(svg, this.x_, this.y_);
  }, this);
};


/**
 * Draws the graph legend.
 * @param {!d3.selection} svg The SVG container.
 * @private
 */
GraphPlotter.prototype.drawLegend_ = function(svg) {
  if (this.curves_.size <= 1) {
    return;
  }

  var i = 0;
  var legend = svg.append('g').
      attr(
          'transform',
          'translate(' + 10 + ',' + 0 + ')');
  this.curves_.forEach(function(curve, curveName) {
    legend.append('rect').
        attr('x', 0).
        attr('y', 6 + (10 * i)).
        attr('height', 3).
        attr('width', 25).
        attr('fill', curve.color);
    legend.append('text').
        attr('x', 30).
        attr('y', 10 + (10 * i)).
        text(curveName);
    i++;
  });
};


/**
 * @return {!d3.axisType}
 * @private
 */
GraphPlotter.prototype.createXAxis_ = function() {
  return d3.svg.axis().scale(this.x_).orient('bottom').ticks(5);
};


/**
 * @return {!d3.axisType}
 * @private
 */
GraphPlotter.prototype.createYAxis_ = function() {
  return d3.svg.axis().scale(this.y_).orient('left').ticks(5);
};


/**
 * Draws the background grid.
 * @param {!d3.selection} svg
 * @private
 */
GraphPlotter.prototype.drawGrid_ = function(svg) {
  svg.append('g').
      attr('class', 'grid').
      attr('transform', 'translate(0,' + this.getHeight_() + ')').
      call(this.createXAxis_().
          tickSize(-this.getHeight_(), 0, 0).
          tickFormat(''));
  svg.append('g').
      attr('class', 'grid').
      call(this.createYAxis_().
          tickSize(-this.getWidth_(), 0, 0).
          tickFormat(''));
};


/**
 * Draws the X and Y axes.
 * @param {!d3.selection} svg
 * @private
 */
GraphPlotter.prototype.drawAxes_ = function(svg) {
  // Draw the X axis
  svg.append('g').
      attr('class', 'x axis').
      attr('transform', 'translate(0,' + this.getHeight_() + ')').
      call(this.createXAxis_());

  // Draw X axis label.
  svg.append('text').
      attr('y', this.getHeight_() + this.margin.top + 30).
      attr('x', this.getWidth_() / 2).
      style('text-anchor', 'middle').
      text('Date');

  // Draw the Y axis.
  svg.append('g').
      attr('class', 'y axis').
      call(this.createYAxis_());

  // Draw Y axis label.
  svg.append('text').
      attr('transform', 'rotate(-90)').
      attr('y', -this.margin.left).
      attr('x', -(this.getHeight_() / 2)).
      attr('dy', '1em').
      style('text-anchor', 'middle').
      text('Execution time (ms)');
};


/**
 * Adds an ovrelay that is used for tracking mouse hovering and displaying the
 * y value at a given point in x.
 * @param {!d3.selection} svg
 * @param {!Array<!Object>} data
 * @private
 */
GraphPlotter.prototype.drawMouseOverlay_ = function(svg, data) {
  var focusOverlay = svg.append('g').
      attr('class', 'focus-overlay').
      style('display', 'none');

  focusOverlay.append('circle').
      attr('r', 4.0);

  focusOverlay.append('line').
      attr('id', 'verticalHighlightLine').
      attr('x1', 0).
      attr('x2', 0).
      attr('y1', this.y_(this.y_.domain()[0])).
      attr('y2', this.y_(this.y_.domain()[1]));

  focusOverlay.append('line').
      attr('id', 'horizontalHighlightLine').
      attr('x1', this.x_(this.x_.domain()[0])).
      attr('x2', this.x_(this.x_.domain()[1])).
      attr('y1', 0).
      attr('y2', 0);

  var focusInfo = new GraphPlotter.FocusInfo_(this, focusOverlay);

  svg.append('rect').
      attr('id', 'overlay').
      attr('width', this.getWidth_()).
      attr('height', this.getHeight_()).
      // Adding mouse events.
      on('mouseover', function() { focusOverlay.style('display', null); }).
      on('mouseout', function() { focusOverlay.style('display', 'none'); }).
      on('mousemove', onMousemove.bind(
          this, document.getElementById('overlay'))).

      // Adding touch events.
      on('touchstart', function() { focusOverlay.style('display', null); }).
      on('touchmove', onMousemove.bind(
          this, document.getElementById('overlay')));

  var bisectDate = d3.bisector(this.getXValue_).left;


  /**
   * @param {!HTMLElement} overlayElement
   * @this {!GraphPlotter}
   */
  function onMousemove(overlayElement) {
    var x0 = this.x_.invert(d3.mouse(overlayElement)[0]);
    var i = bisectDate(data, x0, 1);
    var d0 = data[i - 1];
    var d1 = data[i];
    var d = (x0 - this.getXValue_(d0).getTime() >
        this.getXValue_(d1).getTime() - x0) ? d1 : d0;
    focusOverlay.attr(
        'transform',
        'translate(' + this.getScaledXValue_(d) + ',' +
            this.getScaledYValue_(d) + ')');
    focusOverlay.select('#verticalHighlightLine').
        attr(
            'transform',
            'translate(' + 0 + ',' + (-this.getScaledYValue_(d)) + ')');
    focusOverlay.select('#horizontalHighlightLine').
        attr(
            'transform',
            'translate(' + (-this.getScaledXValue_(d)) + ',' + 0 + ')');
    focusInfo.onMouseMove(d);
  }
};



/**
 * A helper class for rendering extra information about the currently focused
 * point in the graph.
 * @constructor
 * @private
 *
 * @param {!GraphPlotter} graphPlotter The parent graph plotter.
 * @param {!d3.selection} container The element to place the focus information.
 */
GraphPlotter.FocusInfo_ = function(graphPlotter, container) {
  this.graphPlotter_ = graphPlotter;
  this.width_ = 220;
  this.height_ = 140;

  var rowNames = this.graphPlotter_.focusInfoConfig.map(
      function(configEntry) { return configEntry.label; });
  this.tableTemplateEl_ = this.generateTableTemplate_(rowNames);

  this.foreignObject_ = container.append('foreignObject').
      attr('width', this.width_).
      attr('height', this.height_).
      attr('x', 10).
      attr('y', 0);

  this.div_ = this.foreignObject_.append('xhtml:div').
      attr('class', 'focus-info').
      html('<span>An HTML Foreign object</span>');
};


/**
 * Populates the template table with data from the currently focused point.
 * @param {!Object} d The currently focused point.
 * @private
 */
GraphPlotter.FocusInfo_.prototype.populateTableTemplate_ = function(d) {
  var tableRows = Array.prototype.slice.call(
      this.tableTemplateEl_.getElementsByTagName('tr'));

  tableRows.forEach(function(tableRow, index) {
    var valueEl = tableRow.getElementsByTagName('td')[1];
    valueEl.textContent = this.graphPlotter_.focusInfoConfig[index].fn(d);
  }, this);
};


/**
 * Executes whenever a mouse move event is detected.
 * @param {!Object} d The currently focused point.
 */
GraphPlotter.FocusInfo_.prototype.onMouseMove = function(d) {
  this.populateTableTemplate_(d);
  this.div_.html(this.tableTemplateEl_.outerHTML);
  this.foreignObject_.
      attr(
          'transform',
          'translate(' + (-this.graphPlotter_.getScaledXValue_(d)) + ',' +
              (-this.graphPlotter_.getScaledYValue_(d)) + ')');
};


/**
 * Generates the HTML table element that is used for displaying additional
 * information.
 * @param {!Array<string>} rowNames The label of each row.
 * @return {!HTMLElement}
 * @private
 */
GraphPlotter.FocusInfo_.prototype.generateTableTemplate_ = function(rowNames) {
  var tableEl = document.createElement('table');
  var table = d3.select(tableEl);
  var tbody = table.append('tbody');

  rowNames.forEach(function(rowName) {
    var tr = tbody.append('tr');
    tr.append('td').
        attr('class', 'info-label').
        text(rowName);
    tr.append('td').
        attr('class', 'info-value');
  });

  return tableEl;
};
