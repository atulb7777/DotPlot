/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ''Software''), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    import axisHelper = powerbi.extensibility.utils.chart.axis;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;

    export class Visual implements IVisual {
        public static margins: {
            bottom: number;
            left: number;
            right: number;
            top: number;
        } = {
                bottom: 30,
                left: 40,
                right: 0,
                top: 0
            };
        public static isGradientPresent: boolean;
        public static isColorCategoryPresent: boolean;
        public static legendDataPoints: ILegendDataPoint[];
        public static xParentPresent: boolean;
        public static catGroupPresent: boolean;
        public static catPresent: boolean;
        public static catSizePresent: boolean;
        public static legend: ILegend;
        public static dataValues: number[];
        public static xTitleText: string;
        public static yTitleText: string;
        public static legendTitle: string;
        public host: IVisualHost;
        private target: HTMLElement;
        private legendDotSvg: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;
        private viewport: IViewport;
        private colorPalette: IColorPalette;
        private xAxis: d3.Selection<SVGElement>;
        private xParentAxis: d3.Selection<SVGElement>;
        private yAxis: d3.Selection<SVGElement>;
        private yParentAxis: d3.Selection<SVGElement>;
        private xTitle: d3.Selection<SVGElement>;
        private yTitle: d3.Selection<SVGElement>;
        private svg: d3.Selection<SVGElement>;
        private selectionIdBuilder: ISelectionIdBuilder;
        private data: IDotPlotDataPoints;
        private dataView: DataView;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private legendDotTitle: string;
        private interactivityService: IInteractivityService;
        private measureFormat: string;
        private sizeFormat: string;
        // tslint:disable-next-line:no-any
        private categoryColorData: any;
        private baseContainer: d3.Selection<SVGElement>;
        private scrollableContainer: d3.Selection<SVGElement>;
        private yAxisSvg: d3.Selection<SVGElement>;
        private xAxisSvg: d3.Selection<SVGElement>;
        private dotsContainer: d3.Selection<SVGElement>;
        private svgGridLines: d3.Selection<SVGElement>;
        private xParentAxisSvg: d3.Selection<SVGElement>;
        private yParentAxisSvg: d3.Selection<SVGElement>;
        private catLongestText: string;
        private xParentLongestText: string;
        private axisGridLines: d3.Selection<SVGElement>;
        private bgParentAxis: d3.Selection<SVGElement>;
        private lastValue: boolean;
        private newValue: boolean;
        private isChanged: boolean;
        private flipSetting: IFlipSettings;
        private yAxisConfig: IAxisSettings;
        private xAxisConfig: IAxisSettings;
        private rangeConfig: IRangeSettings;
        private legendSetting: ILegendConfig;
        private parentAxisConfigs: IParentAxisSettings;
        private gradientSetting: IGradientSelectorSettings;
        private backgroundSetting: IBackgroundSettings;
        private gridLinesSetting: IGridLinesSettings;
        private tickSetting: ITickSettings;
        private highlight: boolean;
        private clickFlag: boolean;
        private color: string[];
        private sortSetting: ISortSettings;
        private highlightSetting: IHighlightSettings;
        private jitterSetting: IJitterSettings;
        private randomSeed: number;
        private getGradColor: (t: number) => string;
        private colorScale: d3.scale.Linear<number, number>;

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.selectionIdBuilder = options.host.createSelectionIdBuilder();
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
            this.interactivityService = powerbi.extensibility.utils.interactivity.createInteractivityService(options.host);
            Visual.legend = powerbi.extensibility.utils.chart.legend.createLegend(
                options.element,
                options.host && false,
                this.interactivityService,
                true);
            this.target = options.element;
            this.legendDotSvg = d3.select(this.target)
                .append('svg');
            this.baseContainer = d3.select(options.element)
                .append('div')
                .classed('dotPlot_baseContainer', true);

            this.scrollableContainer = this.baseContainer
                .append('div')
                .classed('dotPlot_scrollableContainer', true);

            this.svg = this.scrollableContainer
                .append('svg')
                .classed('dotPlot_dotChart', true);

            this.bgParentAxis = this.svg
                .append('g')
                .classed('dotPlot_bgParentAxis', true);

            this.svgGridLines = this.svg
                .append('g')
                .classed('dotPlot_svgGridLines', true);

            this.axisGridLines = this.svg
                .append('g')
                .classed('dotPlot_axisGridLines', true);

            this.dotsContainer = this.svg.append('g')
                .classed('dotPlot_dotsContainer', true);

            Visual.catSizePresent = false;
            Visual.xParentPresent = false;
            Visual.catGroupPresent = false;
            Visual.catPresent = false;
            this.measureFormat = '';
            this.sizeFormat = '';
            this.xParentLongestText = '';
            this.lastValue = null;
            this.isChanged = false;
            this.color = [];
        }

        public visualTransform(
            options: VisualUpdateOptions, dataView: DataView,
            height: number,
            colors: IColorPalette,
            host: IVisualHost): IDotPlotDataPoints {
            const dotPlotdataPoints: IDotPlotDataPoints = {
                dataPoints: [],
                xTitleText: '',
                yTitleText: '',
                minValue: null,
                maxValue: null
            };
            let dataPoint: IDotPlotViewModel;
            if (!dataView
                || !dataView.categorical
                || !dataView.categorical.values
                || !dataView.categorical.categories) {

                return null;
            }
            Visual.catSizePresent = false;
            Visual.xParentPresent = false;
            Visual.catGroupPresent = false;
            Visual.catPresent = false;
            Visual.isColorCategoryPresent = false;
            Visual.isGradientPresent = false;
            this.categoryColorData = [];
            let xParentIndex: number = 0;
            let yParentIndex: number = 0;
            let catMaxLen: number = 0;
            let currentCat: string = '';
            let xParentMaxLen: number = 0;
            let currentXParent: string = '';
            let globalMin: number = 9999999999999;
            let globalMax: number = -9999999999999;
            const groups: DataViewValueColumnGroup[] = dataView.categorical.values.grouped();

            groups.forEach((group: DataViewValueColumnGroup) => {
                for (let i: number = 0; i < group.values[0].values.length; i++) {
                    if (group.values[0].values[i] !== null) {
                        dataPoint = {
                            category: '',
                            categoryColor: 'red',
                            categoryGroup: '',
                            categorySize: 1,
                            selectionId: null,
                            tooltipData: [],
                            value: 0,
                            xCategoryParent: '',
                            updatedXCategoryParent: '',
                            highlights: null,
                            key: null
                        };
                        const selectionId: visuals.ISelectionId = host.createSelectionIdBuilder()
                            .withCategory(dataView.categorical.categories[0], i)
                            .withSeries(dataView.categorical.values, group)
                            .createSelectionId();
                        for (let k: number = 0; k < group.values.length; k++) {
                            if (group.values[k].source.roles.hasOwnProperty('measure')) {
                                const currentValue: number = (Number(group.values[k].values[i]));
                                if (currentValue || currentValue === 0) {
                                    if (currentValue < globalMin) {
                                        globalMin = currentValue;
                                    }
                                    if (currentValue > globalMax) {
                                        globalMax = currentValue;
                                    }
                                }
                                yParentIndex = k;
                                dotPlotdataPoints.yTitleText = group.values[k].source.displayName;
                                dataPoint.value = currentValue;
                                dataPoint.highlights = group.values[k].highlights ? group.values[k].highlights[i] : null;
                                this.measureFormat = group.values[k].source.format;
                            }
                            if (group.values[k].source.roles.hasOwnProperty('categorySize')) {
                                this.legendDotTitle = group.values[k].source.displayName;
                                Visual.catSizePresent = true;
                                this.sizeFormat = group.values[k].source.format;
                                dataPoint.categorySize = (Number(group.values[k].values[i]));
                            }

                            if (group.values[k].source.roles.hasOwnProperty('categoryColor')) {
                                Visual.isGradientPresent = true;
                                dataPoint.categoryColor = dotPlotUtils.convertToString(group.values[k].values[i]);
                                this.categoryColorData.push(group.values[k].values[i]);
                            }
                            const formatter0: utils.formatting.IValueFormatter = valueFormatter.create({
                                format: group.values[k].source.format ? group.values[k].source.format : valueFormatter.DefaultNumericFormat
                            });
                            const tooltipDataPoint: ITooltipDataPoints = {
                                name: group.values[k].source.displayName,
                                value: formatter0.format(parseFloat(dotPlotUtils.convertToString(group.values[k].values[i])))
                            };
                            dataPoint.tooltipData.push(tooltipDataPoint);
                        }

                        dotPlotdataPoints.minValue = globalMin;
                        dotPlotdataPoints.maxValue = globalMax;
                        let valueFormat: utils.formatting.IValueFormatter;
                        this.highlight = dataView.categorical.values[0].highlights ? true : false;
                        for (let cat1: number = 0; cat1 < dataView.categorical.categories.length; cat1++) {
                            // tslint:disable-next-line:no-any
                            const valueDataview: any = dataView.categorical.categories[cat1].values[i];
                            valueFormat = valueFormatter.create({
                                format: dataView.categorical.categories[cat1].source.format
                            });
                            if (dataView.categorical.categories[cat1].source.roles.hasOwnProperty('category')) {
                                dataPoint.category = valueFormat.format(valueDataview);
                                Visual.catPresent = true;
                            }
                            if (dataView.categorical.categories[cat1].source.roles.hasOwnProperty('categoryGroup')) {
                                dotPlotdataPoints.xTitleText = dataView.categorical.categories[cat1].source.displayName;
                                if (dataView.categorical.categories[cat1].source.type.dateTime) {
                                    dataPoint.categoryGroup = valueFormat.format
                                    (new Date(valueDataview.toString()));
                                } else {
                                    dataPoint.categoryGroup = valueFormat.format(valueDataview);
                                }
                                Visual.catGroupPresent = true;
                            }
                            if (dataView.categorical.categories[cat1].source.roles.hasOwnProperty('xCategoryParent')) {
                                xParentIndex = cat1;
                                if (dataView.categorical.categories[cat1].source.type.dateTime) {
                                    dataPoint.xCategoryParent = valueFormat.format
                                        (new Date(valueDataview.toString()));
                                } else {
                                    dataPoint.xCategoryParent = valueFormat.format(valueDataview);
                                }
                                Visual.xParentPresent = true;
                            }
                            const tooltipDataPoint: ITooltipDataPoints = {
                                name: dataView.categorical.categories[cat1].source.displayName,
                                value: valueFormat.format(valueDataview)
                            };

                            if (JSON.stringify(dataPoint.tooltipData).indexOf(JSON.stringify(tooltipDataPoint)) < 0) {
                                dataPoint.tooltipData.push(tooltipDataPoint);
                            }
                        }

                        for (const k of dataView.metadata.columns) {
                            if (k.roles.hasOwnProperty('categoryColor') && !Visual.isGradientPresent) {
                                dataPoint.categoryColor = dotPlotUtils.convertToString(group.name);
                                Visual.legendTitle = k.displayName;
                                Visual.isColorCategoryPresent = true;
                                const tooltipDataPoint: ITooltipDataPoints = {
                                    name: k.displayName,
                                    value: dotPlotUtils.convertToString(group.name)
                                };
                                dataPoint.tooltipData.push(tooltipDataPoint);
                                break;
                            }
                        }
                        if (Visual.catGroupPresent) {
                            currentCat = dataPoint.categoryGroup;
                        } else if (!Visual.catGroupPresent && Visual.xParentPresent) {
                            currentCat = dataPoint.xCategoryParent;
                        }

                        if (Visual.xParentPresent) {
                            currentXParent = dataPoint.xCategoryParent;
                        }
                        if (currentCat.length > catMaxLen) {
                            catMaxLen = currentCat.length;
                            this.catLongestText = currentCat;
                        }
                        if (currentXParent.length > xParentMaxLen) {
                            xParentMaxLen = currentXParent.length;
                            this.xParentLongestText = currentXParent;
                        }
                        dataPoint.selectionId = selectionId;
                        dotPlotdataPoints.dataPoints.push(dataPoint);
                    }
                }
            });

            for (const iPoints of dotPlotdataPoints.dataPoints) {
                iPoints.updatedXCategoryParent = `${iPoints.xCategoryParent}$$$${iPoints.categoryGroup}`;
            }

            if (!Visual.catGroupPresent && Visual.xParentPresent) {
                dotPlotdataPoints.xTitleText = dataView.categorical.categories[xParentIndex].source.displayName;
                dotPlotdataPoints.yTitleText = dataView.categorical.values[yParentIndex].source.displayName;
            }

            // Creating colors
            Visual.legendDataPoints = [];
            const colorPalette: IColorPalette = host.colorPalette;
            const grouped: DataViewValueColumnGroup[] = dataView.categorical.values.grouped();

            if (Visual.isColorCategoryPresent) {
                Visual.legendDataPoints = grouped
                    .filter((group: DataViewValueColumnGroup) => group.identity)
                    .map((group: DataViewValueColumnGroup, index: number) => {
                        const defaultColor: Fill = {
                            solid: {
                                // tslint:disable-next-line:no-any
                                color: colorPalette.getColor(<any> group.name).value
                            }
                        };

                        return {
                            category: dotPlotUtils.convertToString(group.name),
                            color: enumSettings.DataViewObjects
                                .getValueOverload<Fill>(group.objects, 'colorSelector', 'fill', defaultColor).solid.color,
                            identity: host.createSelectionIdBuilder()
                                .withSeries(dataView.categorical.values, group)
                                .createSelectionId(),
                            selected: false,
                            value: index
                        };
                    });
            } else {
                if (Visual.catSizePresent) {
                    Visual.legendDataPoints.push({
                        category: 'Dummy data',
                        color: '',
                        identity: host.createSelectionIdBuilder()
                            .withCategory(null, 0)
                            .createSelectionId(),
                        selected: false,
                        value: 0
                    });
                    Visual.legendTitle = 'blank';
                }
            }
            // Sorting functionality
            const catElements: string[] = [];
            const catParentElements: string[] = [];
            let catDistinctElements: string[];
            let catDistinctParentElements: string[];
            let concatenatedCat: string[] = [];
            let formatter: utils.formatting.IValueFormatter;
            for (const cat1 of dataView.categorical.categories) {
                if (cat1.source.roles.hasOwnProperty('categoryGroup')) {

                    // tslint:disable-next-line:triple-equals
                    if (cat1.source.displayName != name) {
                        formatter = valueFormatter.create({ format: cat1.source.format });
                        if (cat1.source.type.dateTime) {
                            // tslint:disable-next-line:no-any
                            cat1.values.forEach((element: any) => {
                                catElements.push(formatter.format(new Date(element)));
                            });
                        } else {
                            // tslint:disable-next-line:no-any
                            cat1.values.forEach((element: any) => {

                                catElements.push(formatter.format(element));
                            });

                        }
                    }
                    catDistinctElements = catElements.filter(dotPlotUtils.getDistinctElements);
                    if (this.sortSetting.axis === 'desc') {
                        catDistinctElements.reverse();
                    }
                }
                if (cat1.source.roles.hasOwnProperty('xCategoryParent')) {
                    formatter = valueFormatter.create({ format: cat1.source.format });
                    if (cat1.source.type.dateTime) {
                        // tslint:disable-next-line:no-any
                        cat1.values.forEach((element: any) => {
                            catParentElements.push(formatter.format(new Date(element)));
                        });
                    } else {
                        // tslint:disable-next-line:no-any
                        cat1.values.forEach((element: any) => {
                            catParentElements.push(formatter.format(element));
                        });

                    }
                    // tslint:disable-next-line:no-any
                    cat1.values.forEach((element: any) => {
                        catParentElements.push(formatter.format(element));
                    });
                    catDistinctParentElements = catParentElements.filter(dotPlotUtils.getDistinctElements);
                    if (this.sortSetting.parent === 'desc') {
                        catDistinctParentElements.reverse();
                    }
                }
            }

            if (Visual.xParentPresent && Visual.catGroupPresent) {
                for (let iCounter: number = 0; iCounter < catParentElements.length; iCounter++) {
                    concatenatedCat.push(`${catParentElements[iCounter]}$$$${catElements[iCounter]}`);
                }
                concatenatedCat = concatenatedCat.filter(dotPlotUtils.getDistinctElements);
                if (this.sortSetting.axis === 'desc' && this.sortSetting.parent === 'desc') {
                    concatenatedCat.reverse();
                } else if (this.sortSetting.parent === 'desc') {
                    const reversedParents: string[] = catDistinctParentElements; // already reversed catDistinctParentElements
                    concatenatedCat = [];
                    for (let iCounter: number = 0; iCounter < reversedParents.length; iCounter++) {
                        for (let jCounter: number = 0; jCounter < catParentElements.length; jCounter++) {
                            if (reversedParents[iCounter] === catParentElements[jCounter]) {
                                concatenatedCat.push(`${catParentElements[jCounter]}$$$${catElements[jCounter]}`);
                            }
                        }
                    }
                    concatenatedCat = concatenatedCat.filter(dotPlotUtils.getDistinctElements);
                } else if (this.sortSetting.axis === 'desc') {
                    concatenatedCat = [];
                    const newArray: string[] = [];
                    for (let iCounter: number = 0; iCounter < catDistinctParentElements.length; iCounter++) {
                        for (let jCounter: number = catParentElements.length - 1; jCounter >= 0; jCounter--) {
                            if (catDistinctParentElements[iCounter] === catParentElements[jCounter]) {
                                concatenatedCat.push(`${catParentElements[jCounter]}$$$${catElements[jCounter]}`);
                            }
                        }
                    }
                }
            }

            if (Visual.xParentPresent && Visual.catGroupPresent) {
                for (const item of dotPlotdataPoints.dataPoints) {
                    item.key = concatenatedCat.indexOf(item.updatedXCategoryParent) + 1;
                }
            } else if (Visual.xParentPresent && !Visual.catGroupPresent) {
                for (const item of dotPlotdataPoints.dataPoints) {
                    item.key = catDistinctParentElements.indexOf(item.xCategoryParent) + 1;
                }
            } else if (Visual.catGroupPresent) {
                for (const item of dotPlotdataPoints.dataPoints) {
                    item.key = catDistinctElements.indexOf(item.categoryGroup) + 1;
                }
            }
            dotPlotdataPoints.dataPoints.sort(dotPlotUtils.objectSort('key'));
            // Sorting functionality

            return dotPlotdataPoints;
        }

        public update(options: VisualUpdateOptions): void {
            this.randomSeed = 1;
            this.colorPalette = this.host.colorPalette;
            if (!options) {
                return;
            }
            this.viewport = options.viewport;
            const dataView: DataView = this.dataView = options.dataViews && options.dataViews[0]
                ? options.dataViews[0]
                : null;

            const flipSetting: IFlipSettings = this.flipSetting = enumSettings.getFlipSettings(dataView);
            const sortSetting: ISortSettings = this.sortSetting = enumSettings.getSortSettings(dataView);
            const highlightSetting: IHighlightSettings = this.highlightSetting = enumSettings.getHighlightSettings(dataView);
            const jitterSetting: IJitterSettings = this.jitterSetting = enumSettings.getJitterSettings(dataView);
            const yAxisConfig: IAxisSettings = this.yAxisConfig = enumSettings.getAxisSettings(this.dataView, 'Y');
            const xAxisConfig: IAxisSettings = this.xAxisConfig = enumSettings.getAxisSettings(this.dataView, 'X');
            const rangeConfig: IRangeSettings = this.rangeConfig = enumSettings.getRangeSettings(dataView);
            const legendSetting: ILegendConfig = this.legendSetting = enumSettings.getLegendSettings(dataView);
            const parentAxisConfigs: IParentAxisSettings = this.parentAxisConfigs = enumSettings.getParentAxisSettings(this.dataView);
            this.gradientSetting = enumSettings.getGradientSelectorSettings(this.dataView);
            const backgroundSetting: IBackgroundSettings = this.backgroundSetting = enumSettings.getBackgroundSettings(this.dataView);
            const gridLinesSetting: IGridLinesSettings = this.gridLinesSetting = enumSettings.getGridLinesSettings(this.dataView);
            const tickSettings: ITickSettings = this.tickSetting = enumSettings.getTickSettings(this.dataView);

            const data: IDotPlotDataPoints = this.data = this.visualTransform(
                options,
                dataView,
                this.viewport.height,
                this.colorPalette,
                this.host);

            if (data === null) {
                d3.selectAll('.dotPlot_legendCategory').remove();
                d3.selectAll('.dotPlot_categorySize').remove();
                this.svg.selectAll('.dotPlot_xAxisGrid').remove();
                this.svg.selectAll('.dotPlot_yAxisGrid').remove();
                this.svg.selectAll('.dotPlot_xAxisGridLines').remove();
                this.svg.selectAll('.dotPlot_yAxisGridLines').remove();
                this.svg.selectAll('.dotPlot_dot').remove();
                this.xAxisSvg.remove();
                this.yAxisSvg.remove();
                this.yParentAxisSvg.remove();
                this.xParentAxisSvg.remove();
                this.yAxis.remove();
                this.xAxis.remove();
            }
            const visualContext: this = this;
            Visual.dataValues = [];

            data.dataPoints.forEach(function (d: IDotPlotViewModel): void {
                Visual.dataValues.push(d.value);
            });
            Visual.xTitleText = data.xTitleText;
            Visual.yTitleText = data.yTitleText;

            let width: number = _.clone(options.viewport.width);
            let height: number = _.clone(options.viewport.height);

            const dataSizeValues: number[] = [];
            data.dataPoints.forEach(function (d: IDotPlotViewModel): void {
                dataSizeValues.push(d.categorySize);
            });

            // Legends
            let legendWidth: number = 0;
            let legendHeight: number = 0;
            let isScrollPresent: boolean = false;
            const legendContainer: d3.Selection<HTMLElement> = d3.select('.legend').classed('dotPlot_legend', true);
            const legendGroupContainer: d3.Selection<HTMLElement> = d3.select('.legend #legendGroup').classed('dotPlot_legendGroup', true);
            if (legendSetting.show) {
                this.renderLegend(dataView, legendSetting, true);
                legendWidth = parseFloat(legendContainer.attr('width'));
                legendHeight = parseFloat(legendContainer.attr('height'));
            }

            d3.selectAll('.dotPlot_legendCategory').remove();
            d3.selectAll('.dotPlot_categorySize').remove();

            const legendOrient: LegendPosition = Visual.legend.getOrientation();
            if (legendSetting.show && (Visual.isColorCategoryPresent || Visual.catSizePresent)) {
                switch (legendOrient) {
                    case 0:
                    case 1:
                        isScrollPresent = d3.select('.navArrow')[0][0] ||
                            ((options.viewport.width / 2) < 200 * (legendSetting.fontSize / 10)) ? true : false;
                        break;
                    case 2:
                    case 3:
                        isScrollPresent = d3.select('.navArrow')[0][0] ||
                            ((options.viewport.height / 2) < 200 * (legendSetting.fontSize / 10)) ? true : false;
                        break;
                    default:
                }
            }
            isScrollPresent = isScrollPresent || !Visual.catSizePresent;
            this.renderLegend(dataView, legendSetting, isScrollPresent);

            this.legendDotSvg
                .attr({
                    class: 'dotPlot_sizeLegend',
                    height: 0,
                    width: 0
                })
                .style('position', 'absolute');

            // Position chart, legends, dotPlot legends according to legend position.
            if (Visual.isColorCategoryPresent && !Visual.isGradientPresent) {
                legendGroupContainer.selectAll('*').style('display', 'block');
            } else {
                legendGroupContainer.selectAll('*').style('display', 'none');
            }

            if (legendSetting.show) {
                switch (legendOrient) {
                    case 0:
                        height = height - legendHeight <= 1 ? 1 : height - legendHeight;
                        if (isScrollPresent) {
                            if (Visual.isColorCategoryPresent && Visual.catSizePresent) {
                                this.legendDotSvg.attr({
                                    height: legendHeight,
                                    width: options.viewport.width
                                });
                                height = height - legendHeight <= 1 ? 1 : height - legendHeight;
                                this.legendDotSvg
                                    .style({ 'margin-top': `${legendHeight}px`, 'margin-left': '0' });

                                this.baseContainer.style('margin-top', `${legendHeight * 2}px`);
                            } else {
                                this.legendDotSvg
                                    .style({ 'margin-left': '0' });
                                this.baseContainer.style('margin-top', `${legendHeight}px`);
                            }
                        } else {
                            this.legendDotSvg.attr({
                                height: legendHeight,
                                width: options.viewport.width / 2
                            });
                            this.legendDotSvg.style({ 'margin-top': 0, 'margin-left': `${options.viewport.width / 2}px` });
                        }
                        this.baseContainer.style('height', `${height}px`);
                        this.baseContainer.style('width', `${width}px`);
                        break;
                    case 1:
                        height = height - legendHeight <= 1 ? 1 : height - legendHeight;
                        if (isScrollPresent) {
                            if (Visual.isColorCategoryPresent && Visual.catSizePresent) {
                                this.legendDotSvg.attr({
                                    height: legendHeight,
                                    width: options.viewport.width
                                });
                                height = height - legendHeight <= 1 ? 1 : height - legendHeight;
                                this.legendDotSvg
                                    .style({ 'margin-top': legendContainer.style('margin-top'), 'margin-left': '0px' });
                                legendContainer.style('margin-top', `${height}px`);
                            } else {
                                this.legendDotSvg
                                    .style({ 'margin-top': legendContainer.style('margin-top'), 'margin-left': '0px' });
                            }
                        } else {
                            this.legendDotSvg.attr({
                                height: legendHeight,
                                width: options.viewport.width / 2
                            });
                            this.legendDotSvg
                                .style({
                                    'margin-top': legendContainer
                                        .style('margin-top'), 'margin-left': `${options.viewport.width / 2}px`
                                });
                        }
                        this.baseContainer.style('height', `${height}px`);
                        this.baseContainer.style('width', `${width}px`);
                        break;
                    case 3:
                        width = width - legendWidth <= 0 ? 0 : width - legendWidth;
                        height = height <= 1 ? 1 : height;
                        if (isScrollPresent) {
                            this.legendDotSvg.attr({
                                width: 0,
                                height: 0
                            });
                        } else {
                            this.legendDotSvg.attr({
                                width: legendWidth,
                                height: options.viewport.height / 2
                            });
                            this.legendDotSvg
                                .style({ 'margin-top': `${options.viewport.height / 2}px`, 'margin-left': 0 });
                        }
                        this.baseContainer.style('height', `${height}px`);
                        this.baseContainer.style('width', `${width}px`);
                        break;
                    case 2:
                        width = width - legendWidth <= 0 ? 0 : width - legendWidth;
                        height = height <= 1 ? 1 : height;
                        if (isScrollPresent) {
                            this.legendDotSvg.attr({
                                width: 0,
                                height: 0
                            });
                        } else {
                            this.legendDotSvg.attr({
                                width: legendWidth,
                                height: options.viewport.height / 2
                            });
                            this.legendDotSvg
                                .style({ 'margin-top': `${options.viewport.height / 2}px`, 'margin-left': `${width}px` });
                        }
                        this.baseContainer.style('height', `${height}px`);
                        this.baseContainer.style('width', `${width}px`);
                        break;
                    default:
                }
            }

            if (legendSetting.show && Visual.catSizePresent) {
                this.renderSizeLegend(legendHeight, legendOrient, isScrollPresent, dataSizeValues, legendSetting, legendWidth, options);
            }

            const originalSvgWidth: number = width;
            const originalSvgHeight: number = height;

            this.svg.attr({
                width: width,
                height: height
            });

            this.svg.selectAll('.dotPlot_xAxisGrid').remove();
            this.svg.selectAll('.dotPlot_yAxisGrid').remove();
            this.svg.selectAll('.dotPlot_xAxisGridLines').remove();
            this.svg.selectAll('.dotPlot_yAxisGridLines').remove();
            this.svg.selectAll('.dotPlot_dot').remove();
            this.svg.selectAll('.dotPlot_xAxisGridRect').remove();
            this.baseContainer.select('.errorMessage').remove();
            let translate: number = 0;

            let yAxisFormatter: utils.formatting.IValueFormatter;
            let yAxisWidth: number = 0;
            const xAxisWidth: number = 0;
            let xAxisParentHeight: number = 0;
            const yAxisParentHeight: number = 0;
            let yAxisHeight: number = 0;

            // tslint:disable-next-line:no-any
            let xScale: any; let yScale: any; let rScale: any;
            // tslint:disable-next-line:no-any
            let xAxisFormatter: utils.formatting.IValueFormatter; let yParentScale: any; yParentScale = null;
            const format: string = this.measureFormat;
            let logDomain: number[] = [];
            let logDomainStart: number = data.minValue;
            let logDomainEnd: number = data.maxValue;

            let rangeMin: number = 2;
            let rangeMax: number = 6;

            // Update Min/Max for radius scale
            if (rangeConfig.min || rangeConfig.min === 0) {
                if (rangeConfig.min > 10) {
                    rangeConfig.min = 10;
                    rangeMin = 10;
                } else if (rangeConfig.min < 1) {
                    rangeConfig.min = 1;
                    rangeMin = 1;
                } else {
                    rangeMin = rangeConfig.min;
                }
            }
            if (rangeConfig.max || rangeConfig.max === 0) {
                if (rangeConfig.max > 50) {
                    rangeConfig.max = 50;
                    rangeMax = 50;
                } else if (rangeConfig.max < 1) {
                    rangeConfig.max = 1;
                    rangeMax = 1;
                } else {
                    rangeMax = rangeConfig.max;
                }
                if (rangeConfig.max < rangeConfig.min) {
                    rangeConfig.max = rangeConfig.min;
                    rangeMax = rangeMin;
                }
            }

            if (flipSetting.orient === 'horizontal') {
                this.scrollableContainer.style({ 'overflow-x': 'hidden', 'overflow-y': 'auto' });
                if (this.xAxisSvg) {
                    this.xAxisSvg.remove();
                }
                if (this.yAxisSvg) {
                    this.yAxisSvg.remove();
                }
                if (this.yParentAxisSvg) {
                    this.yParentAxisSvg.remove();
                }
                if (this.xParentAxisSvg) {
                    this.xParentAxisSvg.remove();
                }
                this.xAxisSvg = this.baseContainer
                    .append('svg')
                    .classed('dotPlot_xAxisSvg', true);
                this.xAxis = this.xAxisSvg
                    .append('g')
                    .classed('dotPlot_xAxis', true);
                this.yAxisSvg = this.scrollableContainer.append('svg')
                    .classed('dotPlot_yAxisSvg', true);
                this.yAxis = this.yAxisSvg
                    .append('g')
                    .classed('dotPlot_yAxis', true);
                this.yTitle = this.yAxisSvg.append('g')
                    .classed('dotPlot_yAxis dotPlot_yTitle', true);
                this.xTitle = this.xAxisSvg.append('g')
                    .classed('dotPlot_xAxis dotPlot_xTitle', true);
                this.yParentAxisSvg = this.scrollableContainer.append('svg')
                    .classed('dotPlot_yParentAxisSvg', true);
                this.yParentAxis = this.yParentAxisSvg
                    .append('g')
                    .classed('dotPlot_yParentAxis', true);
                Visual.margins.right = 0;
                Visual.margins.left = 0;
                Visual.margins.bottom = 0;
                Visual.margins.top = 0;
                let xAxisTitleText: string = Visual.xTitleText;
                let yAxisTitleText: string = Visual.yTitleText;

                if (xAxisConfig.titleText) {
                    xAxisTitleText = xAxisConfig.titleText;
                }
                if (yAxisConfig.titleText) {
                    yAxisTitleText = yAxisConfig.titleText;
                }

                let measureTextProperties: TextProperties;

                let domainStart: number = dotPlotUtils.returnMin(Visual.dataValues);
                let domainEnd: number = dotPlotUtils.returnMax(Visual.dataValues);

                if (xAxisConfig.start || xAxisConfig.start === 0) {
                    if (xAxisConfig.end || xAxisConfig.end === 0) {
                        if (xAxisConfig.start < xAxisConfig.end) {
                            domainStart = xAxisConfig.start;
                            logDomainStart = xAxisConfig.start;
                        }
                    } else if (xAxisConfig.start < domainEnd) {
                        domainStart = xAxisConfig.start;
                        logDomainStart = xAxisConfig.start;
                    }
                }

                if (xAxisConfig.end || xAxisConfig.end === 0) {
                    if (xAxisConfig.start || xAxisConfig.start === 0) {
                        if (xAxisConfig.start < xAxisConfig.end) {
                            domainEnd = xAxisConfig.end;
                            logDomainEnd = xAxisConfig.end;
                        }
                    } else if (xAxisConfig.end > domainStart) {
                        domainEnd = xAxisConfig.end;
                        logDomainEnd = xAxisConfig.end;
                    }
                }

                const value: number =
                Math.abs(domainEnd) > Math.abs(domainStart) ? Math.abs(domainEnd) : Math.abs(domainStart);
                let decimalPlaces: number = 0;

                if (xAxisConfig.decimalPlaces || xAxisConfig.decimalPlaces === 0) {
                    if (xAxisConfig.decimalPlaces > 4) {
                        xAxisConfig.decimalPlaces = 4;
                        decimalPlaces = xAxisConfig.decimalPlaces;
                    } else if (xAxisConfig.decimalPlaces < 0) {
                        xAxisConfig.decimalPlaces = null;
                    } else {
                        decimalPlaces = xAxisConfig.decimalPlaces;
                    }
                }

                xAxisFormatter = valueFormatter.create({
                    format: format, precision: decimalPlaces, value: xAxisConfig.displayUnits === 0 ?
                        dotPlotUtils.getValueUpdated(value) : xAxisConfig.displayUnits
                });
                const formattedMaxMeasure: string = xAxisFormatter.format(value);
                measureTextProperties = {
                    fontFamily: xAxisConfig.labelsFontFamily,
                    fontSize: `${xAxisConfig.fontSize}px`,
                    text: formattedMaxMeasure
                };
                if (xAxisConfig.show) {
                    let xTitleHeight: number = 0;
                    if (xAxisConfig.showTitle) {
                        const xTitleTextProperties: TextProperties = {
                            fontFamily: xAxisConfig.titleFontFamily,
                            fontSize: `${xAxisConfig.titleSize}px`,
                            text: xAxisTitleText
                        };
                        xTitleHeight = textMeasurementService.measureSvgTextHeight(xTitleTextProperties);
                        Visual.margins.bottom = xTitleHeight + 5;
                    }

                    const xAxisHeight: number = textMeasurementService.measureSvgTextHeight(measureTextProperties) + 5;
                    Visual.margins.bottom += xAxisHeight;
                } else {
                    Visual.margins.bottom = 5;
                    xAxisParentHeight = 0;
                }

                let yTitleHeight: number = 0;
                if (yAxisConfig.show) {
                    if (yAxisConfig.showTitle) {
                        const yTitleTextProperties: TextProperties = {
                            fontFamily: yAxisConfig.titleFontFamily,
                            fontSize: `${yAxisConfig.titleSize}px`,
                            text: yAxisTitleText
                        };
                        yTitleHeight = textMeasurementService.measureSvgTextHeight(yTitleTextProperties) + 5;
                        Visual.margins.left = yTitleHeight;
                    }

                    const catTextProperties: TextProperties = {
                        fontFamily: yAxisConfig.labelsFontFamily,
                        fontSize: `${yAxisConfig.fontSize}px`,
                        text: this.catLongestText
                    };
                    yAxisWidth = flipSetting.flipText ?
                        textMeasurementService.measureSvgTextWidth(catTextProperties) + 5 :
                        textMeasurementService.measureSvgTextHeight(catTextProperties) + 5;
                    Visual.margins.left += yAxisWidth;

                    const parentTextProperties: TextProperties = {
                        fontFamily: parentAxisConfigs.fontFamily,
                        fontSize: `${parentAxisConfigs.fontSize}px`,
                        text: this.xParentLongestText
                    };

                    if (Visual.catGroupPresent && Visual.xParentPresent) {
                        yAxisHeight = flipSetting.flipParentText ?
                            textMeasurementService.measureSvgTextWidth(parentTextProperties) + 15 :
                            textMeasurementService.measureSvgTextHeight(parentTextProperties);
                    } else {
                        const measureTextWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);
                        yAxisHeight = measureTextWidth / 2;
                    }

                    if (this.parentAxisConfigs.split) {
                        Visual.margins.right = yAxisHeight;
                    } else {
                        yAxisHeight = yAxisHeight;
                        Visual.margins.left += yAxisHeight + 5;
                        const measureTextWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties) + 2;
                        Visual.margins.right = measureTextWidth / 2;
                    }

                } else {
                    const measureTextWidth: number = textMeasurementService
                        .measureSvgTextWidth(measureTextProperties) + 2; //2 for (-) sign in labels
                    Visual.margins.right = measureTextWidth / 2;
                    Visual.margins.left = measureTextWidth / 2;
                }

                Visual.margins.left -= 5;
                // Svg adjustment
                width = width - Visual.margins.left - Visual.margins.right < 0 ? 0 : width - Visual.margins.left - Visual.margins.right;
                height = height - Visual.margins.bottom < 0 ? 0 : height - Visual.margins.bottom;

                this.svg.attr('width', width);
                this.svg.attr('height', height);
                this.svg.style('margin-left', `${Visual.margins.left}px`);
                this.svg.style('margin-top', '0px');

                // X Axis adjustment
                this.xAxisSvg.attr({
                    width: `100%`,
                    height: `${((Visual.margins.bottom) / originalSvgHeight) * 100}%`
                });
                this.xAxisSvg.style({
                    'margin-top': `${height}px`
                });
                // Y Axis adjustment
                this.yAxisSvg.attr({
                    width: `${((Visual.margins.left) / originalSvgWidth) * 100}%`,
                    height: `${((height + Visual.margins.bottom) / originalSvgHeight) * 100}%`
                });

                // X Axis parent adjustment
                if (this.parentAxisConfigs.split) {
                    this.yParentAxisSvg.attr({
                        width: `${(Visual.margins.right / originalSvgWidth) * 100}%`,
                        height: `${((height + Visual.margins.bottom) / originalSvgHeight) * 100}%`
                    });
                    this.yParentAxisSvg.style('margin-left', `${width + Visual.margins.left}px`);
                } else {
                    this.yParentAxisSvg.attr({
                        width: `${(yAxisHeight / originalSvgWidth) * 100}%`,
                        height: `${((height + Visual.margins.bottom) / originalSvgHeight) * 100}%`
                    });
                    this.yParentAxisSvg.style('margin-left', `${yTitleHeight}px`);
                }

                // Scales
                if (xAxisConfig.scale === 'log') { // checking for linear or log scale
                    if (data.minValue <= 0 || (this.measureFormat && this.measureFormat.indexOf('%') !== -1)) {
                        legendGroupContainer.selectAll('*').style('display', 'none');
                        this.baseContainer.style({
                            height: `${options.viewport.height}px`,
                            width: `${options.viewport.width}px`,
                            margin: 0
                        });
                        this.baseContainer.append('div')
                            .classed('errorMessage', true)
                            .style('font-size', '16px')
                            .text('Data contains negative, percentage or zero values. To show these data points use a different scale.');

                        return;
                    } else {
                        legendGroupContainer.selectAll('*').style('display', 'block');
                        // check for maxValue and minValue nulls
                        logDomain = dotPlotUtils.getLogDomain(logDomainStart, logDomainEnd);
                        xScale = d3.scale.log()
                            .domain([logDomain[0], logDomain[logDomain.length - 1]])
                            .range([0, width]);
                    }
                } else {
                    xScale = d3.scale.linear()
                        .domain([domainStart, domainEnd])
                        .range([0, width]);
                }

                yScale = d3.scale.ordinal()

                    .domain(data.dataPoints.map((d: IDotPlotViewModel) => d.updatedXCategoryParent))
                    .rangeBands([height, 3]);

                rScale = d3.scale.linear()
                    .domain([dotPlotUtils.returnMin(dataSizeValues), (dotPlotUtils.returnMax(dataSizeValues))])
                    .range([rangeMin, rangeMax]);

                const widthForXAxis: number = width;
                const heightForXAxis: number = height;
                let textProperties: TextProperties = {
                    fontFamily: xAxisConfig.labelsFontFamily,
                    fontSize: `${xAxisConfig.fontSize}px`,
                    text: this.catLongestText
                };

                const yAxisPoints: number = data.dataPoints.map((d: IDotPlotViewModel) =>
                    d.updatedXCategoryParent).filter(dotPlotUtils.getDistinctElements).length;

                // calcualte minimum width for Y-Axis labels
                let minWidth: number = this.jitterSetting.show ? 50 : 30;
                if (yAxisConfig.minWidth || yAxisConfig.minWidth === 0) {
                    if (yAxisConfig.minWidth > 300) {
                        yAxisConfig.minWidth = 300;
                        minWidth = 300;
                    } else if (yAxisConfig.minWidth < 5) {
                        yAxisConfig.minWidth = 5;
                        minWidth = 5;
                    } else {
                        minWidth = yAxisConfig.minWidth;
                    }
                    if (yAxisConfig.minWidth < yAxisConfig.fontSize) {
                        yAxisConfig.minWidth = yAxisConfig.fontSize;
                        minWidth = yAxisConfig.fontSize;
                    }
                    if (this.jitterSetting.show) {
                        if (yAxisConfig.minWidth < 50) {
                            minWidth = 50;
                            yAxisConfig.minWidth = 50;
                        }
                    }
                }
                // Scroll logic
                if ((minWidth * yAxisPoints) > (height)) {
                    height = (minWidth * yAxisPoints);
                    width = width - 20 < 0 ? 0 : width - 20;
                    xScale.range([0, width]);
                    yScale.rangeBands([height, 3]);
                    this.svg.attr({
                        width: width,
                        height: height
                    });
                    this.yParentAxisSvg.attr({
                        height: height,
                        width: `${(yAxisHeight / (originalSvgWidth - 20)) * 100}%`
                    });
                    if (this.parentAxisConfigs.split) {
                        this.yParentAxisSvg.style('margin-left', `${width + Visual.margins.left}px`);
                    } else {
                        this.yParentAxisSvg.style('margin-left', `${yTitleHeight}px`);
                    }

                    this.yAxisSvg.attr({
                        width: Visual.margins.left,
                        height: height
                    });
                }

                this.scrollableContainer.style('width', `${Visual.margins.left + widthForXAxis + Visual.margins.right}px`);
                this.scrollableContainer.style('height', `${heightForXAxis}px`);
                this.scrollableContainer.style('margin-left', '0px');

                const yAxis: d3.svg.Axis = d3.svg.axis()
                    .scale(yScale)
                    .orient('left');

                const xAxis: d3.svg.Axis = d3.svg.axis()
                    .scale(xScale)
                    .ticks(axisHelper.getRecommendedNumberOfTicksForXAxis(width))
                    .orient('bottom');

                if (xAxisConfig.scale === 'log') {
                    xAxis.tickValues(logDomain);
                }

                // Draw X Axis
                if (xAxisConfig.show) {
                    this.xAxis.attr('transform', `translate(${Visual.margins.left})`)
                        .call(xAxis);

                    this.xAxisSvg.selectAll('.dotPlot_xAxis .tick').append('title')

                        .text((d: string) => {
                            return d;
                        });
                }
                // Update y-Axis labels
                if (yAxisConfig.show) {
                    if (yAxisConfig.showTitle) {
                        const yTitleTextProps: TextProperties = {
                            fontFamily: yAxisConfig.titleFontFamily,
                            fontSize: `${yAxisConfig.titleSize}px`,
                            text: yAxisTitleText
                        };
                        this.yTitle
                            .classed('dotPlot_yTitle', true)
                            .attr('transform', `translate(5,${heightForXAxis / 2})`)
                            .append('text')
                            .attr('transform', 'rotate(-90)')
                            .attr('dy', '0.71em')
                            .attr('text-anchor', 'middle')
                            .style('font-size', `${yAxisConfig.titleSize}px`)
                            .style('font-family', yAxisConfig.titleFontFamily)
                            .style('fill', yAxisConfig.titleColor)
                            .text(textMeasurementService.getTailoredTextOrDefault(yTitleTextProps, heightForXAxis))
                            .append('title')
                            .text(yAxisTitleText);
                    }
                    this.yAxis
                        .attr('transform', `translate(${Visual.margins.left},0)`)
                        .call(yAxis);

                    const yAxisSvgText: d3.Selection<{}> = this.yAxisSvg.selectAll('.dotPlot_yAxis .tick text');
                    yAxisSvgText
                        .style('font-size', `${yAxisConfig.fontSize}px`)
                        .style('font-family', yAxisConfig.labelsFontFamily)
                        .style('fill', yAxisConfig.fontColor)
                        .text(function (d: string): string {
                            textProperties = {
                                fontFamily: yAxisConfig.labelsFontFamily,
                                fontSize: `${yAxisConfig.fontSize}px`,
                                text: dotPlotUtils.getText(d)
                            };

                            return textMeasurementService.getTailoredTextOrDefault(textProperties, flipSetting.flipText ?
                                1000 : yScale.rangeBand());
                        })
                        .attr('data-parent', function (d: string): string {
                            return d.substring(0, d.indexOf('$$$') >= 0 ? d.indexOf('$$$') : 0);
                        });

                    if (flipSetting.flipText) {
                        yAxisSvgText
                            .style('text-anchor', 'end')
                            .attr('transform', 'rotate(0)')
                            .attr('x', -3);
                    } else {
                        yAxisSvgText
                            .style('text-anchor', 'middle')
                            .attr('transform', 'rotate(-90)')
                            .attr('y', -yAxisWidth / 2)
                            .attr('x', 0);
                    }

                    this.yAxis.selectAll('path')
                        .remove();

                    this.xAxis.selectAll('path')
                        .remove();

                    // For category Parent
                    if (!(!Visual.catGroupPresent && Visual.xParentPresent) || (!Visual.xParentPresent)) {
                        this.yParentAxis.selectAll('.dotPlot_xAxisGridLines').remove();

                        // tslint:disable-next-line:no-any
                        let yTicks: any;
                        yTicks = this.yAxisSvg.selectAll('.dotPlot_yAxis .tick text');

                        const yTicksLen: number = yTicks.size();
                        const yParentTicks: string[] = [];
                        let isBool: boolean = false;
                        let iCounter: number = 0;
                        let j: number = 0; let i: number = 0;
                        translate = height;
                        this.svgGridLines.append('line')
                            .classed('dotPlot_xAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: 1,
                                x2: 1,
                                y1: 3,
                                y2: height
                            });

                        this.svgGridLines.append('line')
                            .classed('dotPlot_xAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: width,
                                x2: width,
                                y1: 3,
                                y2: height
                            });
                        this.svgGridLines.append('line')
                            .classed('dotPlot_yAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: width,
                                x2: 0,
                                y1: 3,
                                y2: 3
                            });

                        this.svgGridLines.append('line')
                            .classed('dotPlot_yAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: width,
                                x2: 0,
                                y1: height,
                                y2: height
                            });
                        if (tickSettings.showCategoryTicks && Visual.xParentPresent) {
                            this.yParentAxisSvg.append('line')
                                .classed('dotPlot_yAxisparentGridLines', true)
                                .attr({
                                    stroke: tickSettings.categoryTickColor,
                                    'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                    x1: 0,
                                    x2: yAxisHeight,
                                    y1: Visual.margins.top + 3,
                                    y2: Visual.margins.top + 3
                                });

                            this.yParentAxisSvg.append('line')
                                .classed('dotPlot_yAxisparentGridLines', true)
                                .attr({
                                    stroke: tickSettings.categoryTickColor,
                                    'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                    x1: 0,
                                    x2: yAxisHeight,
                                    y1: height,
                                    y2: height
                                });
                        }
                        if (tickSettings.showAxisTicks) {
                            this.yAxisSvg.append('line')
                                .classed('dotPlot_xAxisGridLines', true)
                                .attr({
                                    stroke: tickSettings.color,
                                    'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                                    x1: 0,
                                    x2: -yAxisWidth,
                                    y1: height,
                                    y2: height
                                })
                                .attr('transform', `translate(${Visual.margins.left}, 0)`);
                        }

                        for (i = 0; i < yTicksLen; i++) {
                            isBool = false;

                            const parent: string = yTicks[0][i].getAttribute('data-parent');
                            let yWidth: number = 0;

                            // tslint:disable-next-line:no-any
                            let xAttr: any = yTicks[0][i].parentNode.getAttribute('transform').substring(12, yTicks[0][i]
                                .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][i]
                                    .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][i]
                                        .parentNode.getAttribute('transform').length - 1);
                            for (j = i; j < yTicksLen; j++) {

                                const nextParent: string = yTicks[0][j].getAttribute('data-parent');

                                let xNextAttr: string = yTicks[0][j].parentNode.getAttribute('transform').substring(12, yTicks[0][j]
                                    .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][j]
                                        .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][j]
                                            .parentNode.getAttribute('transform').length - 1);
                                if (parent === nextParent) {
                                    isBool = true;
                                    yWidth += yScale.rangeBand();
                                    if (tickSettings.showAxisTicks) {
                                        this.yAxis.append('line')
                                            .classed('dotPlot_yAxisGridLines', true)
                                            .attr({
                                                stroke: tickSettings.color,
                                                'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                                                y1: -(yScale.rangeBand() / 2),
                                                y2: -(yScale.rangeBand() / 2),
                                                x1: 0,
                                                x2: -yAxisWidth,
                                                transform: `translate(0, ${xNextAttr})`
                                            });
                                    }
                                } else if (isBool) {
                                    xAttr = (parseFloat(xAttr) +
                                        parseFloat(yTicks[0][j - 1].parentNode.getAttribute('transform').substring(12, yTicks[0][j - 1]
                                            .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][j - 1]
                                                .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][j - 1]
                                                    .parentNode.getAttribute('transform').length - 1))) / 2;
                                    i = j - 1;
                                    xNextAttr = yTicks[0][i].parentNode.getAttribute('transform').substring(12, yTicks[0][i]
                                        .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][i]
                                            .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][i]
                                                .parentNode.getAttribute('transform').length - 1);
                                    if (j < yTicksLen) {
                                        if (tickSettings.showCategoryTicks) {
                                            this.yParentAxis.append('line')
                                                .classed('dotPlot_yAxisGridLines', true)
                                                .attr({
                                                    stroke: tickSettings.categoryTickColor,
                                                    'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                                    y1: -(yScale.rangeBand() / 2),
                                                    y2: -(yScale.rangeBand() / 2),
                                                    x1: 0,
                                                    x2: yAxisHeight,
                                                    transform: `translate(0, ${xNextAttr})`
                                                });
                                        }
                                        if (gridLinesSetting.showCategoryGridLines) {
                                            this.svgGridLines.append('line')
                                                .classed('dotPlot_yAxisGridLines', true)
                                                .attr({
                                                    stroke: gridLinesSetting.categoryColor,
                                                    'stroke-width': 0.5 + (gridLinesSetting.categoryThickness / 100),
                                                    'stroke-dasharray': gridLinesSetting.categoryStyle === 'dashed' ? '5, 5' :
                                                        gridLinesSetting.categoryStyle === 'dotted' ? '1, 5' : null,
                                                    y1: -(yScale.rangeBand() / 2),
                                                    y2: -(yScale.rangeBand() / 2),
                                                    x1: 0,
                                                    x2: width,
                                                    transform: `translate(0, ${xNextAttr})`
                                                });
                                        }
                                    }

                                    break;
                                } else {
                                    xNextAttr = yTicks[0][j - 1].parentNode.getAttribute('transform').substring(12, yTicks[0][j - 1]
                                        .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][j - 1]
                                            .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][j - 1]
                                                .parentNode.getAttribute('transform').length - 1);
                                    if (j < yTicksLen - 1) {
                                        this.yAxis.append('line')
                                            .classed('dotPlot_yAxisGridLines', true)
                                            .attr({
                                                stroke: '#A6A6A6',
                                                'stroke-width': 1,
                                                y1: -(yScale.rangeBand() / 2),
                                                y2: -(yScale.rangeBand() / 2),
                                                x1: 0,
                                                x2: width,
                                                transform: `translate(0, ${xNextAttr})`
                                            });
                                    }
                                    break;
                                }

                            }
                            if (j === yTicksLen && isBool) {
                                xAttr = (parseFloat(xAttr) + parseFloat(yTicks[0][j - 1]
                                    .parentNode.getAttribute('transform').substring(12, yTicks[0][j - 1]
                                        .parentNode.getAttribute('transform').indexOf(',') > 12 ? yTicks[0][j - 1]
                                            .parentNode.getAttribute('transform').indexOf(',') : yTicks[0][j - 1]
                                                .parentNode.getAttribute('transform').length - 1))) / 2;
                                i = j - 1;
                            }

                            textProperties = {
                                fontFamily: parentAxisConfigs.fontFamily,
                                fontSize: `${parentAxisConfigs.fontSize}px`,
                                text: parent
                            };

                            this.yParentAxis
                                .append('g')
                                .attr('transform', `translate(0, ${xAttr})`)
                                .classed('dotPlot_yParentAxis', true)
                                .append('text')
                                .text(textMeasurementService.getTailoredTextOrDefault(textProperties, flipSetting.flipParentText ?
                                    1000 : yWidth))
                                .attr('x', flipSetting.flipParentText ? 5 : 0)
                                .attr('y', flipSetting.flipParentText ? -10 : 6)
                                .attr('transform', flipSetting.flipParentText ? 'rotate(0)' : 'rotate(-90)')
                                .attr('dy', '0.71em')
                                .style('text-anchor', flipSetting.flipParentText ? 'start' : 'middle')
                                .append('title')
                                .text(parent);

                            // Alternating bg color logic
                            if (backgroundSetting.show && Visual.xParentPresent && Visual.catGroupPresent) {
                                translate -= (yWidth);
                                this.svgGridLines.append('rect')
                                    .classed('dotPlot_xAxisGridRect', true)
                                    .attr({
                                        fill: iCounter % 2 === 0 ? backgroundSetting.bgPrimaryColor : backgroundSetting.bgSecondaryColor,
                                        x: 0,
                                        y: 0,
                                        width: width - (1 + (gridLinesSetting.categoryThickness / 100)) < 0 ?
                                            0 : width - (0.5 + (gridLinesSetting.categoryThickness / 100)),
                                        height: yWidth,
                                        'fill-opacity': (100 - backgroundSetting.bgTransparency) / 100
                                    })
                                    .attr('transform', `translate(0, ${translate})`);
                            }
                            iCounter++;
                        }
                    }

                    this.yParentAxisSvg.selectAll('.dotPlot_yParentAxis text')
                        .style('font-size', `${parentAxisConfigs.fontSize}px`)
                        .style('font-family', parentAxisConfigs.fontFamily)
                        .style('fill', parentAxisConfigs.fontColor);

                    if (!Visual.catGroupPresent && Visual.xParentPresent) {
                        this.yAxisSvg.selectAll('.dotPlot_yAxis .tick').append('title')
                            .text(function (d: string): string {
                                return d.substring(0, d.indexOf('$$$'));
                            });
                    } else {
                        this.yAxisSvg.selectAll('.dotPlot_yAxis .tick').append('title')
                            .text(function (d: string): string {
                                return d.substring(d.indexOf('$$$') >= 0 ? d.indexOf('$$$') + 3 : 0, d.length);
                            });
                    }
                } else {
                    this.yAxisSvg.selectAll('.dotPlot_yAxis .tick text').text('');
                    this.yAxisSvg.selectAll('path').remove();
                }
                if (xAxisConfig.show) {
                    // Draw X Axis grid lines

                    // tslint:disable-next-line:no-any
                    let xTicks: any;
                    xTicks = this.xAxisSvg.selectAll('.dotPlot_xAxis .tick');
                    const tickLeng: number = xTicks.size();

                    let start: number = 0;
                    if (gridLinesSetting.showAxisGridLines) {
                        for (; start < tickLeng; start++) {

                            const xCoordinate: string = xTicks[0][start]
                                .getAttribute('transform')
                                .substring(10, xTicks[0][start]
                                    .getAttribute('transform')
                                    .indexOf(',') >= 0 ? xTicks[0][start]
                                        .getAttribute('transform')
                                        .indexOf(',') : xTicks[0][start]
                                            .getAttribute('transform').length - 1);
                            this.axisGridLines.append('line')
                                .classed('dotPlot_xAxisGrid', true).attr({
                                    stroke: gridLinesSetting.color,
                                    'stroke-width': 0.25 + (gridLinesSetting.thickness / 133.33),
                                    'stroke-dasharray': gridLinesSetting.axisStyle === 'dashed' ? '5, 5' :
                                        gridLinesSetting.axisStyle === 'dotted' ? '1, 5' : null,
                                    x1: xCoordinate,
                                    x2: xCoordinate,
                                    y1: (height),
                                    y2: 3
                                });
                        }
                    }

                    this.xAxis.selectAll('path')
                        .remove();

                    if (xAxisConfig.showTitle) {
                        const xTitleTextProps: TextProperties = {
                            fontFamily: xAxisConfig.titleFontFamily,
                            fontSize: `${xAxisConfig.titleSize}px`,
                            text: xAxisTitleText
                        };
                        this.xTitle
                            .classed('dotPlot_xTitle', true)
                            .attr('transform', `translate(${Visual.margins.left + (widthForXAxis / 2)}, ${Visual.margins.bottom - 5})`)
                            .append('text')
                            .attr('dy', '-0.32em')
                            .attr('text-anchor', 'middle')
                            .style('font-size', `${xAxisConfig.titleSize}px`)
                            .style('font-family', xAxisConfig.titleFontFamily)
                            .style('fill', xAxisConfig.titleColor)
                            .text(textMeasurementService.getTailoredTextOrDefault(xTitleTextProps, widthForXAxis))
                            .append('title')
                            .text(xAxisTitleText);
                    }

                    this.xAxisSvg.selectAll('.dotPlot_xAxis .tick text')
                        .style('font-size', `${xAxisConfig.fontSize}px`)
                        .style('font-family', xAxisConfig.labelsFontFamily)
                        .style('fill', xAxisConfig.fontColor)
                        .text(function (d: string): string {
                            textProperties = {
                                fontFamily: xAxisConfig.labelsFontFamily,
                                fontSize: `${xAxisConfig.fontSize}px`,
                                text: xAxisFormatter.format(d)
                            };

                            return textMeasurementService
                                .getTailoredTextOrDefault(textProperties, ((width - Visual.margins.left) /
                                    axisHelper.getRecommendedNumberOfTicksForXAxis(width)) - 5);
                        });

                    //tooltip information adding
                    const tooptipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                        format: this.measureFormat
                    });
                    d3.selectAll('.dotPlot_xAxis .tick text')
                        .append('title')
                        .text(function (d: string): string {
                            return tooptipFormatter.format(d);
                        });

                } else {
                    this.xAxisSvg.selectAll('.dotPlot_xAxis .tick text').text('');
                    this.xAxis.selectAll('path').remove();
                }

            } else {
                let xAxisTitleText: string = Visual.xTitleText;
                let yAxisTitleText: string = Visual.yTitleText;

                if (xAxisConfig.titleText) {
                    xAxisTitleText = xAxisConfig.titleText;
                }
                if (yAxisConfig.titleText) {
                    yAxisTitleText = yAxisConfig.titleText;
                }

                let xAxisHeight: number = 0;
                Visual.margins.right = 0;
                Visual.margins.top = 0;

                this.scrollableContainer.style({ 'overflow-x': 'auto', 'overflow-y': 'hidden' });

                if (this.xAxisSvg) {
                    this.xAxisSvg.remove();
                }
                if (this.yAxisSvg) {
                    this.yAxisSvg.remove();
                }
                if (this.xParentAxisSvg) {
                    this.xParentAxisSvg.remove();
                }
                if (this.yParentAxisSvg) {
                    this.yParentAxisSvg.remove();
                }
                this.xAxisSvg = this.scrollableContainer.append('svg')
                    .classed('dotPlot_xAxisSvg', true);
                this.xAxis = this.xAxisSvg
                    .append('g')
                    .classed('dotPlot_xAxis', true);
                this.yAxisSvg = this.baseContainer.append('svg')
                    .classed('dotPlot_yAxisSvg', true);
                this.yAxis = this.yAxisSvg
                    .append('g')
                    .classed('dotPlot_yAxis', true);
                this.yTitle = this.yAxisSvg.append('g')
                    .classed('dotPlot_yAxis dotPlot_yTitle', true);
                this.xTitle = this.xAxisSvg.append('g')
                    .classed('dotPlot_xAxis dotPlot_xTitle', true);
                this.xParentAxisSvg = this.scrollableContainer.append('svg')
                    .classed('dotPlot_xParentAxisSvg', true);
                this.xParentAxis = this.xParentAxisSvg
                    .append('g')
                    .classed('dotPlot_xParentAxis', true);

                let measureTextHeight: number;

                let domainStart: number = dotPlotUtils.returnMin(Visual.dataValues);
                let domainEnd: number = dotPlotUtils.returnMax(Visual.dataValues);

                if (yAxisConfig.start || yAxisConfig.start === 0) {
                    if (yAxisConfig.end || yAxisConfig.end === 0) {
                        if (yAxisConfig.start < yAxisConfig.end) {
                            domainStart = yAxisConfig.start;
                            logDomainStart = yAxisConfig.start;
                        }
                    } else if (yAxisConfig.start < domainEnd) {
                        domainStart = yAxisConfig.start;
                        logDomainStart = yAxisConfig.start;
                    }
                }
                if (yAxisConfig.end || yAxisConfig.end === 0) {
                    if (yAxisConfig.start || yAxisConfig.start === 0) {
                        if (yAxisConfig.start < yAxisConfig.end) {
                            domainEnd = yAxisConfig.end;
                            logDomainEnd = yAxisConfig.end;
                        }
                    } else if (yAxisConfig.end > domainStart) {
                        domainEnd = yAxisConfig.end;
                        logDomainEnd = yAxisConfig.end;
                    }
                }

                const value: number =
                Math.abs(domainEnd) > Math.abs(domainStart) ? Math.abs(domainEnd) : Math.abs(domainStart);

                let decimalPlaces: number = 0;

                if (yAxisConfig.decimalPlaces || yAxisConfig.decimalPlaces === 0) {
                    if (yAxisConfig.decimalPlaces > 4) {
                        yAxisConfig.decimalPlaces = 4;
                        decimalPlaces = yAxisConfig.decimalPlaces;
                    } else if (yAxisConfig.decimalPlaces < 0) {
                        yAxisConfig.decimalPlaces = null;
                    } else {
                        decimalPlaces = yAxisConfig.decimalPlaces;
                    }
                }

                yAxisFormatter = valueFormatter.create({
                    format: format, precision: decimalPlaces, value: yAxisConfig.displayUnits === 0 ?
                        dotPlotUtils.getValueUpdated(value) : yAxisConfig.displayUnits
                });
                const formattedMaxMeasure: string = yAxisFormatter.format(value);
                const measureTextPropertiesForMeasure: TextProperties = {
                    fontFamily: yAxisConfig.labelsFontFamily,
                    fontSize: `${yAxisConfig.fontSize}px`,
                    text: formattedMaxMeasure
                };
                if (yAxisConfig.show) {
                    Visual.margins.left = 0;
                    let yTitleHeight: number = 0;
                    if (yAxisConfig.showTitle) {
                        const yTitleTextProperties: TextProperties = {
                            fontFamily: yAxisConfig.titleFontFamily,
                            fontSize: `${yAxisConfig.titleSize}px`,
                            text: yAxisTitleText
                        };
                        yTitleHeight = textMeasurementService.measureSvgTextHeight(yTitleTextProperties);
                        if (yAxisConfig.position === 'left') {
                            Visual.margins.left = yTitleHeight + 10;
                        } else {
                            Visual.margins.right = yTitleHeight + 10;
                        }
                    }
                    yAxisWidth = textMeasurementService.measureSvgTextWidth(measureTextPropertiesForMeasure) + 10;
                    if (yAxisConfig.position === 'left') {
                        Visual.margins.left += (yAxisWidth);
                    } else {
                        Visual.margins.right += (yAxisWidth);
                    }
                } else {
                    Visual.margins.left = 2;
                }
                if (xAxisConfig.show) {
                    Visual.margins.bottom = 0;
                    let xTitleHeight: number = 0;
                    if (xAxisConfig.showTitle) {
                        const xTitleTextProperties: TextProperties = {
                            fontFamily: xAxisConfig.titleFontFamily,
                            fontSize: `${xAxisConfig.titleSize}px`,
                            text: xAxisTitleText
                        };
                        xTitleHeight = textMeasurementService.measureSvgTextHeight(xTitleTextProperties);
                        Visual.margins.bottom = xTitleHeight + 10;
                    }
                    let measureTextPropertiesForGroup: TextProperties = {
                        fontFamily: xAxisConfig.labelsFontFamily,
                        fontSize: `${xAxisConfig.fontSize}px`,
                        text: 'X'
                    };
                    xAxisHeight = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForGroup) + 5;
                    Visual.margins.bottom += xAxisHeight;

                    if (Visual.catGroupPresent && Visual.xParentPresent) {
                        measureTextPropertiesForGroup = {
                            fontFamily: parentAxisConfigs.fontFamily,
                            fontSize: `${parentAxisConfigs.fontSize}px`,
                            text: 'X'
                        };
                        xAxisParentHeight = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForGroup);
                        if (this.parentAxisConfigs.split) {
                            Visual.margins.top = xAxisParentHeight + 5;
                        } else {
                            Visual.margins.bottom += xAxisParentHeight + 5;
                            measureTextHeight = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForMeasure);
                            Visual.margins.top = measureTextHeight / 2;
                        }
                    } else {
                        measureTextHeight = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForMeasure);
                        Visual.margins.top = measureTextHeight / 2;
                    }
                } else {
                    measureTextHeight = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForMeasure);
                    Visual.margins.top = measureTextHeight / 2;
                    Visual.margins.bottom = measureTextHeight / 2;
                    xAxisParentHeight = 0;
                }
                // Svg adjustment
                width = width - Visual.margins.left - Visual.margins.right < 0 ? 0 : width - Visual.margins.left - Visual.margins.right;
                height = (height - Visual.margins.bottom - Visual.margins.top) < 0 ?
                    0 : height - Visual.margins.bottom - Visual.margins.top;
                this.svg.attr('width', '100%');
                this.svg.attr('height', height);
                this.svg.style('margin-top', `${Visual.margins.top}px`);
                this.svg.style('margin-left', '0px');
                // Y Axis adjustment
                this.yAxisSvg.attr({
                    width: `${((Visual.margins.left + Visual.margins.right) / options.viewport.width) * 100}%`,
                    height: '100%'
                });
                if (yAxisConfig.position === 'right') {
                    this.yAxisSvg.style('margin-left', width);
                }
                // X Axis adjustment
                this.xAxisSvg.attr({
                    width: '100%',
                    height: `${(Visual.margins.bottom / originalSvgHeight) * 100}%`
                });
                this.xAxisSvg.style('margin-top', `${height + Visual.margins.top}px`);
                // X Axis parent adjustment
                if (this.parentAxisConfigs.split) {
                    this.xParentAxisSvg.attr({
                        width: '100%',
                        height: `${((xAxisParentHeight + 5) / (height + Visual.margins.bottom)) * 100}%`
                    });
                } else {
                    this.xParentAxisSvg.attr({
                        width: '100%',
                        height: `${((xAxisParentHeight + 5) / (height + Visual.margins.bottom)) * 100}%`
                    });
                    this.xParentAxisSvg.style('margin-top', `${height + xAxisHeight + Visual.margins.top}px`);
                }

                // Scales
                if (yAxisConfig.scale === 'log') { // checking for linear or log scale
                    if (data.minValue <= 0 || (this.measureFormat && this.measureFormat.indexOf('%') !== -1)) {
                        legendGroupContainer.selectAll('*').style('display', 'none');
                        this.baseContainer.style({
                            height: `${options.viewport.height}px`,
                            width: `${options.viewport.width}px`,
                            margin: 0
                        });
                        this.baseContainer.append('div')
                            .classed('errorMessage', true)
                            .style('font-size', '16px')
                            .text('Data contains negative, percentage or zero values. To show these data points use a different scale.');

                        return;
                    } else {
                        legendGroupContainer.selectAll('*').style('display', 'block');
                        // check for maxValue and minValue nulls
                        logDomain = dotPlotUtils.getLogDomain(logDomainStart, logDomainEnd);
                        yScale = d3.scale.log()
                            .domain([logDomain[0], logDomain[logDomain.length - 1]])
                            .range([height, 0]);
                    }
                } else {
                    yScale = d3.scale.linear()
                        .domain([domainStart, domainEnd])
                        .range([height, 0]);
                }

                xScale = d3.scale.ordinal()
                    .domain(data.dataPoints.map((d: IDotPlotViewModel) => d.updatedXCategoryParent))
                    .rangeBands([0, width - 2]);

                rScale = d3.scale.linear()
                    .domain([dotPlotUtils.returnMin(dataSizeValues), (dotPlotUtils.returnMax(dataSizeValues))])
                    .range([rangeMin, rangeMax]);

                const widthForXAxis: number = width;
                const heightForXAxis: number = height;
                let textProperties: TextProperties = {
                    fontFamily: xAxisConfig.labelsFontFamily,
                    fontSize: `${xAxisConfig.fontSize}px`,
                    text: this.catLongestText
                };
                const xAxisPoints: number = data.dataPoints.map((d: IDotPlotViewModel) => d.updatedXCategoryParent)
                    .filter(dotPlotUtils.getDistinctElements).length;

                // calcualte minimum width for X-Axis labels
                let minWidth: number = this.jitterSetting.show ? 50 : 30;
                if (xAxisConfig.minWidth || xAxisConfig.minWidth === 0) {
                    if (xAxisConfig.minWidth > 300) {
                        xAxisConfig.minWidth = 300;
                        minWidth = 300;
                    } else if (xAxisConfig.minWidth < 5) {
                        xAxisConfig.minWidth = 5;
                        minWidth = 300;
                    } else {
                        minWidth = xAxisConfig.minWidth;
                    }
                    if (this.jitterSetting.show) {
                        if (xAxisConfig.minWidth < 50) {
                            minWidth = 50;
                            xAxisConfig.minWidth = 50;
                        }
                    }
                }

                // Scroll logic
                if ((minWidth * xAxisPoints) > (width)) {
                    width = (minWidth * xAxisPoints);
                    height = height - 20 < 0 ? 0 : height - 20;
                    xScale.rangeBands([0, width - 2]);
                    yScale.range([height, 0]);
                    this.svg.attr({
                        width: width,
                        height: height
                    });
                    this.xParentAxisSvg.attr({
                        width: width
                    });
                    if (!this.parentAxisConfigs.split) {
                        this.xParentAxisSvg.style('margin-top', `${height + xAxisHeight + Visual.margins.top}px`);
                    }
                    this.xAxisSvg.style({
                        'margin-top': `${height + Visual.margins.top}px`
                    });
                    this.xAxisSvg.attr({
                        width: width,
                        height: Visual.margins.bottom
                    });
                }
                this.scrollableContainer.style('width', `${((widthForXAxis) / options.viewport.width) * 100}%`);
                this.scrollableContainer
                    .style('height', `${((heightForXAxis + Visual.margins.bottom + Visual.margins.top) / options.viewport.height) * 100}%`);
                this.scrollableContainer.style('margin-left', `${Visual.margins.left}px`);

                const xAxis: d3.svg.Axis = d3.svg.axis()
                    .scale(xScale)
                    .orient('bottom');

                const yAxis: d3.svg.Axis = d3.svg.axis()
                    .scale(yScale)
                    .ticks(axisHelper.getRecommendedNumberOfTicksForYAxis(height - Visual.margins.bottom - Visual.margins.top))
                    .orient(yAxisConfig.position === 'left' ? 'left' : 'right');

                if (yAxisConfig.scale === 'log') {
                    yAxis.tickValues(logDomain);
                }

                if (yAxisConfig.show) {
                    yAxis.tickFormat(yAxisFormatter.format);
                    this.yAxis.attr(
                        'transform',
                        `translate(${Visual.margins.left},${Visual.margins.top})`
                    )
                        .call(yAxis);

                    this.yAxisSvg.selectAll('.dotPlot_yAxis text')
                        .style('font-size', `${yAxisConfig.fontSize}px`)
                        .style('font-family', yAxisConfig.labelsFontFamily)
                        .style('fill', yAxisConfig.fontColor);

                    this.yAxisSvg.selectAll('.dotPlot_yAxis .tick').append('title')

                        .text((d: string) => {
                            return d;
                        });
                }

                this.xAxis.selectAll('.dotPlot_xAxisGridLines').remove();
                if (xAxisConfig.show) {
                    if (xAxisConfig.showTitle) {
                        const xTitleTextProps: TextProperties = {
                            fontFamily: xAxisConfig.titleFontFamily,
                            fontSize: `${xAxisConfig.titleSize}px`,
                            text: xAxisTitleText
                        };
                        this.xTitle
                            .classed('dotPlot_xTitle', true)
                            .attr('transform', `translate(${widthForXAxis / 2},${Visual.margins.bottom - 5})`)
                            .append('text')
                            .attr('dy', '-0.32em')
                            .attr('text-anchor', 'middle')
                            .style('font-size', `${xAxisConfig.titleSize}px`)
                            .style('font-family', xAxisConfig.titleFontFamily)
                            .style('fill', xAxisConfig.titleColor)
                            .text(textMeasurementService.getTailoredTextOrDefault(xTitleTextProps, widthForXAxis))
                            .append('title')
                            .text(xAxisTitleText);
                    }

                    this.xAxis.call(xAxis);

                    this.xAxisSvg.selectAll('.dotPlot_xAxis .tick text')
                        .style('font-size', `${xAxisConfig.fontSize}px`)
                        .style('font-family', xAxisConfig.labelsFontFamily)
                        .style('fill', xAxisConfig.fontColor);

                    this.xAxisSvg.selectAll('.dotPlot_xAxis .tick text')
                        .text(function (d: string): string {
                            textProperties = {
                                fontFamily: xAxisConfig.labelsFontFamily,
                                fontSize: `${xAxisConfig.fontSize}px`,
                                text: dotPlotUtils.getText(d)
                            };

                            return textMeasurementService.getTailoredTextOrDefault(textProperties, xScale.rangeBand());
                        })
                        .attr('data-parent', function (d: string): string {
                            return d.substring(0, d.indexOf('$$$') >= 0 ? d.indexOf('$$$') : 0);
                        });

                    // For category Parent
                    if (!(!Visual.catGroupPresent && Visual.xParentPresent) || (!Visual.xParentPresent)) {
                        // tslint:disable-next-line:no-any
                        let xTicks: any;
                        xTicks = this.xAxisSvg.selectAll('.dotPlot_xAxis .tick text');
                        // tslint:disable-next-line:no-any
                        const xTicksLen: any = xTicks.size();
                        const xParentTicks: string[] = [];
                        let isBool: boolean = false;
                        let iCounter: number = 0;
                        let j: number = 0; let i: number = 0;
                        this.svgGridLines.append('line')
                            .classed('dotPlot_xAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: 1,
                                x2: 1,
                                y1: 0,
                                y2: height
                            });

                        this.svgGridLines.append('line')
                            .classed('dotPlot_xAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: width - 2,
                                x2: width - 2,
                                y1: 0,
                                y2: height
                            });

                        this.svgGridLines.append('line')
                            .classed('dotPlot_yAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: 0,
                                x2: width - 2,
                                y1: 0,
                                y2: 0
                            });

                        this.svgGridLines.append('line')
                            .classed('dotPlot_yAxisGridLines', true)
                            .attr({
                                stroke: '#A6A6A6',
                                'stroke-width': 1,
                                x1: 0,
                                x2: width - 2,
                                y1: (height),
                                y2: (height)
                            });
                        if (tickSettings.showCategoryTicks && Visual.xParentPresent) {
                            this.xParentAxisSvg.append('line')
                                .classed('dotPlot_xAxisparentGridLines', true)
                                .attr({
                                    stroke: tickSettings.categoryTickColor,
                                    'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                    x1: 1,
                                    x2: 1,
                                    y1: xAxisParentHeight + 5,
                                    y2: 0
                                });

                            this.xParentAxisSvg.append('line')
                                .classed('dotPlot_xAxisparentGridLines', true)
                                .attr({
                                    stroke: tickSettings.categoryTickColor,
                                    'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                    x1: width - 2,
                                    x2: width - 2,
                                    y1: xAxisParentHeight + 5,
                                    y2: 0
                                });
                        }
                        if (tickSettings.showAxisTicks) {
                            this.xAxisSvg.append('line')
                                .classed('dotPlot_xAxisGridLines', true)
                                .attr({
                                    stroke: tickSettings.color,
                                    'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                                    x1: 1,
                                    x2: 1,
                                    y1: 0,
                                    y2: xAxisHeight
                                });
                        }
                        for (i = 0; i < xTicksLen; i++) {
                            isBool = false;

                            const parent: string = xTicks[0][i].getAttribute('data-parent');
                            let xWidth: number = 0;

                            // tslint:disable-next-line:no-any
                            let xAttr: any = xTicks[0][i].parentNode.getAttribute('transform').substring(10, xTicks[0][i]
                                .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][i]
                                    .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][i]
                                        .parentNode.getAttribute('transform').length - 1);
                            for (j = i; j < xTicksLen; j++) {

                                const nextParent: string = xTicks[0][j].getAttribute('data-parent');

                                let xNextAttr: string = xTicks[0][j].parentNode.getAttribute('transform').substring(10, xTicks[0][j]
                                    .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][j]
                                        .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][j]
                                            .parentNode.getAttribute('transform').length - 1);
                                if (parent === nextParent) {
                                    isBool = true;
                                    xWidth += xScale.rangeBand();
                                    if (tickSettings.showAxisTicks) {
                                        this.xAxis.append('line')
                                            .classed('dotPlot_xAxisGridLines', true)
                                            .attr({
                                                stroke: tickSettings.color,
                                                'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                                                x1: xScale.rangeBand() / 2,
                                                x2: xScale.rangeBand() / 2,
                                                y1: 0,
                                                y2: xAxisHeight,
                                                transform: `translate(${xNextAttr}, 0)`
                                            });
                                    }
                                } else if (isBool) {
                                    xAttr = (parseFloat(xAttr) + parseFloat(xTicks[0][j - 1]
                                        .parentNode.getAttribute('transform').substring(10, xTicks[0][j - 1]
                                            .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][j - 1]
                                                .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][j - 1]
                                                    .parentNode.getAttribute('transform').length - 1))) / 2;
                                    i = j - 1;
                                    xNextAttr = xTicks[0][i]
                                        .parentNode.getAttribute('transform').substring(10, xTicks[0][i]
                                            .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][i]
                                                .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][i]
                                                    .parentNode.getAttribute('transform').length - 1);
                                    if (j < xTicksLen) {
                                        if (tickSettings.showCategoryTicks) {
                                            this.xParentAxis.append('line')
                                                .classed('dotPlot_xAxisGridLines', true)
                                                .attr({
                                                    stroke: tickSettings.categoryTickColor,
                                                    'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                                    x1: xScale.rangeBand() / 2,
                                                    x2: xScale.rangeBand() / 2,
                                                    y1: 0,
                                                    y2: xAxisParentHeight + 5,
                                                    transform: `translate(${xNextAttr}, 0)`
                                                });
                                        }

                                        if (gridLinesSetting.showCategoryGridLines) {
                                            this.svgGridLines.append('line')
                                                .classed('dotPlot_xAxisGridLines', true)
                                                .attr({
                                                    stroke: gridLinesSetting.categoryColor,
                                                    'stroke-width': 0.5 + (gridLinesSetting.categoryThickness / 100),
                                                    'stroke-dasharray': gridLinesSetting.categoryStyle === 'dashed' ? '5, 5' :
                                                        gridLinesSetting.categoryStyle === 'dotted' ? '1, 5' : null,
                                                    x1: xScale.rangeBand() / 2,
                                                    x2: xScale.rangeBand() / 2,
                                                    y1: 0,
                                                    y2: height,
                                                    transform: `translate(${xNextAttr}, 0)`
                                                });
                                        }
                                    }
                                    break;
                                } else {
                                    xNextAttr = xTicks[0][j - 1]
                                        .parentNode.getAttribute('transform').substring(10, xTicks[0][j - 1]
                                            .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][j - 1]
                                                .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][j - 1]
                                                    .parentNode.getAttribute('transform').length - 1);
                                    if (j < xTicksLen - 1) {
                                        this.xAxis.append('line')
                                            .classed('dotPlot_xAxisGridLines', true)
                                            .attr({
                                                stroke: '#A6A6A6',
                                                'stroke-width': 1,
                                                x1: xScale.rangeBand() / 2,
                                                x2: xScale.rangeBand() / 2,
                                                y1: 0,
                                                y2: height,
                                                transform: `translate(${xNextAttr}, 0)`
                                            });
                                    }
                                    break;
                                }

                            }
                            if (j === xTicksLen && isBool) {
                                xAttr = (parseFloat(xAttr) + parseFloat(xTicks[0][j - 1]
                                    .parentNode.getAttribute('transform').substring(10, xTicks[0][j - 1]
                                        .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][j - 1]
                                            .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][j - 1]
                                                .parentNode.getAttribute('transform').length - 1))) / 2;
                                i = j - 1;
                            }

                            textProperties = {
                                fontFamily: parentAxisConfigs.fontFamily,
                                fontSize: `${parentAxisConfigs.fontSize}px`,
                                text: parent
                            };

                            if (backgroundSetting.show && Visual.xParentPresent && Visual.catGroupPresent) {
                                this.svgGridLines.append('rect')
                                    .classed('dotPlot_xAxisGridRect', true)
                                    .attr({
                                        fill: iCounter % 2 === 0 ? backgroundSetting.bgPrimaryColor : backgroundSetting.bgSecondaryColor,
                                        x: 1,
                                        y: 1,
                                        width: gridLinesSetting.showCategoryGridLines ?
                                            (xWidth - (1 + (gridLinesSetting.categoryThickness / 100))) : xWidth,
                                        height: height,
                                        'fill-opacity': (100 - backgroundSetting.bgTransparency) / 100
                                    })
                                    .attr('transform', `translate(${translate}, 0)`);

                                translate += (xWidth);
                            }

                            this.xParentAxis
                                .append('g')
                                .attr('transform', `translate(${xAttr}, 0)`)
                                .classed('dotPlot_xParentAxis', true)
                                .append('text')
                                .text(textMeasurementService.getTailoredTextOrDefault(textProperties, xWidth))
                                .attr('x', 0)
                                .attr('y', 9)
                                .attr('dy', '0.71em')
                                .style('text-anchor', 'middle')
                                .append('title')
                                .text(parent);

                            iCounter++;
                        }
                    }

                    this.xParentAxisSvg.selectAll('.dotPlot_xParentAxis text')
                        .style('font-size', `${parentAxisConfigs.fontSize}px`)
                        .style('font-family', parentAxisConfigs.fontFamily)
                        .style('fill', parentAxisConfigs.fontColor);

                    this.xAxis.selectAll('path')
                        .remove();

                    if (!Visual.catGroupPresent && Visual.xParentPresent) {
                        this.xAxisSvg.selectAll('.dotPlot_xAxis .tick').append('title')
                            .text(function (d: string): string {
                                return d.substring(0, d.indexOf('$$$'));
                            });
                    } else {
                        this.xAxisSvg.selectAll('.dotPlot_xAxis .tick').append('title')
                            .text(function (d: string): string {
                                return d.substring(d.indexOf('$$$') >= 0 ? d.indexOf('$$$') + 3 : 0, d.length);
                            });
                    }

                } else {
                    this.xAxisSvg.selectAll('.dotPlot_xAxis .tick text').text('');
                    this.xAxis.selectAll('path').remove();
                }

                if (yAxisConfig.show) {
                    // Draw Y Axis grid lines

                    // tslint:disable-next-line:no-any
                    let yTicks: any;
                    yTicks = this.yAxisSvg.selectAll('.dotPlot_yAxis .tick');

                    // tslint:disable-next-line:no-any
                    const tickLeng: any = yTicks.size();
                    let start: number = 0;
                    if (gridLinesSetting.showAxisGridLines) {
                        for (; start < tickLeng; start++) {
                            const yCoordinate: string = yTicks[0][start]
                                .getAttribute('transform')
                                .substring(12, yTicks[0][start]
                                    .getAttribute('transform').length - 1);
                            this.axisGridLines.append('line')
                                .classed('dotPlot_yAxisGrid', true).attr({
                                    stroke: gridLinesSetting.color,
                                    'stroke-width': 0.25 + (gridLinesSetting.thickness / 133.33),
                                    'stroke-dasharray': gridLinesSetting.axisStyle === 'dashed' ? '5, 5' :
                                        gridLinesSetting.axisStyle === 'dotted' ? '1, 5' : null,
                                    x1: 1,
                                    x2: width - 2,
                                    y1: yCoordinate,
                                    y2: yCoordinate
                                });
                        }
                    }
                    const yTitleTextProps: TextProperties = {
                        fontFamily: yAxisConfig.titleFontFamily,
                        fontSize: `${yAxisConfig.titleSize}px`,
                        text: yAxisTitleText
                    };
                    if (yAxisConfig.showTitle) {
                        this.yTitle
                            .classed('dotPlot_yTitle', true)
                            .attr('transform', `translate(${yAxisConfig.position === 'left' ?
                                10 : Visual.margins.right - 10},${Visual.margins.top + (height / 2)})`)
                            .append('text')
                            .attr('transform', 'rotate(-90)')
                            .attr('dy', yAxisConfig.position === 'left' ? '0.71em' : '0.0em')
                            .attr('text-anchor', 'middle')
                            .style('font-size', `${yAxisConfig.titleSize}px`)
                            .style('font-family', yAxisConfig.titleFontFamily)
                            .style('fill', yAxisConfig.titleColor)
                            .text(textMeasurementService.getTailoredTextOrDefault(yTitleTextProps, height))
                            .append('title')
                            .text(yAxisTitleText);
                    }

                    this.yAxisSvg.selectAll('.dotPlot_yAxis .tick text')

                        .text(function (d: string): string {
                            textProperties = {
                                fontFamily: yAxisConfig.labelsFontFamily,
                                fontSize: `${yAxisConfig.fontSize}px`,
                                text: yAxisFormatter.format(d)
                            };

                            return textMeasurementService.getTailoredTextOrDefault(textProperties, yAxisWidth + 1);
                        });

                    //tooltip information adding
                    const tooptipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                        format: this.measureFormat
                    });
                    d3.selectAll('.dotPlot_yAxis .tick text')
                        .append('title')

                        .text(function (d: string): string {
                            return tooptipFormatter.format(d);
                        });

                    this.yAxisSvg.selectAll('.dotPlot_yParentAxis .tick text')

                        .text(function (d: string): string {
                            textProperties = {
                                fontFamily: parentAxisConfigs.fontFamily,
                                fontSize: `${parentAxisConfigs.fontSize}px`,
                                text: d
                            };

                            return textMeasurementService.getTailoredTextOrDefault(textProperties, yParentScale.rangeBand());
                        })
                        .attr('dy', '0.8em')
                        .attr('x', '0')
                        .attr('y', '0')
                        .style('text-anchor', 'middle')
                        .attr('transform', 'rotate(90)');

                    this.yAxis.selectAll('path').remove();
                } else {
                    this.yAxisSvg.selectAll('.dotPlot_yAxis .tick text').text('');
                    this.yAxis.selectAll('path').remove();
                }
            }

            this.renderDots(data, xScale, yScale, rScale, visualContext);

            this.clickFlag = false;
            const dots: d3.Selection<IDotPlotViewModel> = d3.selectAll('.dotPlot_dot');
            // Highlighting logic
            if (this.highlight) {
                this.clickFlag = true;

                dots.attr('fill-opacity', function (d: IDotPlotViewModel): number {
                    if (d.highlights) {
                        return 0.9;
                    } else {
                        return 0.15;
                    }
                });
                dots.attr('stroke-opacity', function (d: IDotPlotViewModel): number {
                    if (d.highlights) {
                        return 0.9;
                    } else {
                        return 0.15;
                    }
                });
            }

            // Hover logic
            $('.dotPlot_dot').mousemove(
                function (): void {
                    if (!visualContext.clickFlag) {
                        dots.attr('fill-opacity', 0.15);
                        dots.attr('stroke-opacity', 0.15);
                        $(this)
                            .attr('fill-opacity', 0.9)
                            .attr('stroke-opacity', 0.9)
                            .attr('stroke', rangeConfig.hoverColor);
                    }
                });
            $('.dotPlot_dot').mouseout(
                function (): void {
                    if (!visualContext.clickFlag) {
                        dots
                            .attr(
                                'stroke', (d: IDotPlotViewModel): string =>
                                    visualContext.rangeConfig.style === 'solid' ?
                                        visualContext.rangeConfig.borderColor
                                        : Visual.isGradientPresent ?
                                            visualContext.getGradColor(visualContext.colorScale(parseFloat(d.categoryColor)))
                                            : dotPlotUtils.getColor(visualContext.rangeConfig, d))
                            .attr('fill-opacity', (100 - rangeConfig.transparency) / 100)
                            .attr('stroke-opacity', (100 - rangeConfig.transparency) / 100);
                    }
                });

            // Highlight mode logic
            if ((+Visual.catPresent + +Visual.catGroupPresent + +Visual.xParentPresent) === 1) {
                highlightSetting.show = false;
            }
            if (highlightSetting.show === false) {
                // Highlight mode = off
                dots.on('click', null);
                $(document).off('click');
                // Cross filtering
                dots.on('click', function (d: IDotPlotViewModel): void {
                    d3.select(this).attr('stroke', visualContext.rangeConfig.style === 'solid' ?
                        visualContext.rangeConfig.borderColor :
                        dotPlotUtils.getColor(visualContext.rangeConfig, d));
                    visualContext.selectionManager.select(d.selectionId, true).then((ids: ISelectionId[]) => {
                        dots.attr('fill-opacity', function (e: IDotPlotViewModel): number {
                            if (ids.length && ids.indexOf(e.selectionId) === -1 && visualContext.color.indexOf(e.categoryColor) === -1) {
                                return 0.15;
                            } else {
                                return 0.9;
                            }
                        });
                        dots.attr('stroke-opacity', function (e: IDotPlotViewModel): number {
                            if (ids.length && ids.indexOf(e.selectionId) === -1 && visualContext.color.indexOf(e.categoryColor) === -1) {
                                return 0.15;
                            } else {
                                return 0.9;
                            }
                        });

                        if (ids.length) {
                            visualContext.clickFlag = true;
                        } else {
                            dots.attr('stroke', (i: IDotPlotViewModel): string =>
                                    visualContext.rangeConfig.style === 'solid' ?
                                        visualContext.rangeConfig.borderColor :
                                        dotPlotUtils.getColor(visualContext.rangeConfig, i))
                                .attr('fill-opacity', (100 - rangeConfig.transparency) / 100)
                                .attr('stroke-opacity', (100 - rangeConfig.transparency) / 100);
                            visualContext.clickFlag = false;
                        }

                        // tslint:disable-next-line:no-any
                        d3.selectAll('.legendItem').attr('fill-opacity', function (legend: any): number {
                            if (legend &&
                                legend.tooltip &&
                                visualContext.color.length &&
                                visualContext.color.indexOf(legend.tooltip) === -1) {
                                return 0.15;
                            } else {
                                return 1;
                            }
                        });
                    });
                    (<Event>d3.event).stopPropagation();
                });
            } else {
                // Highlight mode = on
                dots.on('click', null);
                $(document).off('click');
                dots.on('click', function (d: IDotPlotViewModel): void {
                    d3.select(this).attr('stroke', visualContext.rangeConfig.style === 'solid' ?
                        visualContext.rangeConfig.borderColor :
                        dotPlotUtils.getColor(visualContext.rangeConfig, d));
                    (<Event>d3.event).stopPropagation();
                    visualContext.clickFlag = true;
                    dots.attr('fill-opacity', function (e: IDotPlotViewModel): number {
                        if (d.categoryGroup && d.xCategoryParent && d.category) {
                            if (d.category === e.category && d.categoryGroup === e.categoryGroup) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        } else if (d.categoryGroup && d.xCategoryParent) {
                            if (d.categoryGroup === e.categoryGroup) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        } else {
                            if (d.category === e.category) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        }
                    });
                    dots.attr('stroke-opacity', function (e: IDotPlotViewModel): number {
                        if (d.categoryGroup && d.xCategoryParent && d.category) {
                            if (d.category === e.category && d.categoryGroup === e.categoryGroup) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        } else if (d.categoryGroup && d.xCategoryParent) {
                            if (d.categoryGroup === e.categoryGroup) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        } else {
                            if (d.category === e.category) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        }
                    });
                });
            }

            // Document click
            $(document)
                .on('click', () => this.selectionManager.clear()
                    .then(() => this.clickFlag = false)
                    .then(() =>
                        dots.attr('stroke', (d: IDotPlotViewModel): string =>
                                this.rangeConfig.style === 'solid' ?
                                    this.rangeConfig.borderColor
                                    : Visual.isGradientPresent ?
                                        this.getGradColor(this.colorScale(parseFloat(d.categoryColor)))
                                            : dotPlotUtils.getColor(this.rangeConfig, d))
                            .attr('fill-opacity', (100 - rangeConfig.transparency) / 100)
                            .attr('stroke-opacity', (100 - rangeConfig.transparency) / 100)
                    )
                    .then(() => d3.selectAll('.legendItem').attr({ 'fill-opacity': 1 }))
                    .then(() => visualContext.color = []));

            $('#legendGroup').on('click.load', '.navArrow', function (): void {
                visualContext.addLegendSelection();
            });

            //Selection logic for legends
            visualContext.addLegendSelection();

            // Adding tooltips
            this.tooltipServiceWrapper.addTooltip(
                d3.selectAll('.dotPlot_dot'),
                (tooltipEvent: TooltipEventArgs<IDotPlotViewModel>) => this.getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<IDotPlotViewModel>) => tooltipEvent.data.selectionId
            );
        }

        // tslint:disable-next-line:no-any
        public getX(d: IDotPlotViewModel, xScale: any): number {
            let jitter: number = 0;
            jitter = this.jitterSetting.show ? Math.floor(dotPlotUtils.getRandom(this.randomSeed++) * 20) - 10 : 0;
            if (this.flipSetting.orient === 'horizontal') {
                return xScale(d.value);
            } else {
                return xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 + jitter;
            }
        }

        // tslint:disable-next-line:no-any
        public getY(d: IDotPlotViewModel, yScale: any): number {
            let jitter: number = 0;
            jitter = this.jitterSetting.show ? Math.floor(dotPlotUtils.getRandom(this.randomSeed++) * 20) - 10 : 0;
            if (this.flipSetting.orient === 'horizontal') {
                return yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + jitter;
            } else {
                return yScale(d.value);
            }
        }

        // tslint:disable-next-line:no-any
        public renderDots(data: IDotPlotDataPoints, xScale: any, yScale: any, rScale: any, visualContext: this): void {
            const context: this = this;
            const points: d3.selection.Update<IDotPlotViewModel> = this.dotsContainer.selectAll('.dotPlot_dot').data(data.dataPoints);
            if (this.rangeConfig.shape === 'circle') {
                points.enter()
                    .append('circle')
                    .classed('dotPlot_dot', true);

                points.attr({
                    cx: (d: IDotPlotViewModel): number => this.getX(d, xScale),
                    cy: (d: IDotPlotViewModel): number => this.getY(d, yScale),
                    r: (d: IDotPlotViewModel): number => rScale(d.categorySize),
                    stroke: (d: IDotPlotViewModel): string =>
                        this.rangeConfig.style === 'solid' ? this.rangeConfig.borderColor : dotPlotUtils.getColor(this.rangeConfig, d),
                    'stroke-width': 2,
                    'fill-opacity': (100 - this.rangeConfig.transparency) / 100,
                    'stroke-opacity': (100 - this.rangeConfig.transparency) / 100
                });
                points.exit().remove();

            } else if (this.rangeConfig.shape === 'square') {
                // tslint:disable-next-line:no-any
                const arc: any = d3.svg.symbol().type('square')
                    .size(function (d: IDotPlotViewModel): number { return 4 * rScale(d.categorySize) * rScale(d.categorySize); });

                points.enter()
                    .append('path')
                    .classed('dotPlot_dot', true);

                points.attr({
                    d: arc,
                    transform: function (d: IDotPlotViewModel): string {
                        return `translate(${context.getX(d, xScale)},${context.getY(d, yScale)})`;
                    },
                    stroke: (d: IDotPlotViewModel): string =>
                    this.rangeConfig.style === 'solid' ? this.rangeConfig.borderColor : dotPlotUtils.getColor(this.rangeConfig, d),
                    'stroke-width': 2,
                    'fill-opacity': (100 - this.rangeConfig.transparency) / 100,
                    'stroke-opacity': (100 - this.rangeConfig.transparency) / 100
                });
                points.exit().remove();
            } else if (this.rangeConfig.shape === 'triangle') {
                // tslint:disable-next-line:no-any
                const arc: any = d3.svg.symbol().type('triangle-up')
                    .size(function (d: IDotPlotViewModel): number { return 2.5 * rScale(d.categorySize) * rScale(d.categorySize); });

                points.enter()
                    .append('path')
                    .classed('dotPlot_dot', true);

                points.attr({
                    d: arc,
                    transform: function (d: IDotPlotViewModel): string {
                        return `translate(${context.getX(d, xScale)},${context.getY(d, yScale)})`;
                    },
                    stroke: (d: IDotPlotViewModel): string =>
                    this.rangeConfig.style === 'solid' ? this.rangeConfig.borderColor : dotPlotUtils.getColor(this.rangeConfig, d),
                    'stroke-width': 2,
                    'fill-opacity': (100 - this.rangeConfig.transparency) / 100,
                    'stroke-opacity': (100 - this.rangeConfig.transparency) / 100
                });
                points.exit().remove();
            } else {
                // tslint:disable-next-line:no-any
                const arc: any = d3.svg.symbol().type('diamond')
                    .size(function (d: IDotPlotViewModel): number { return 2 * rScale(d.categorySize) * rScale(d.categorySize); });

                points.enter()
                    .append('path')
                    .classed('dotPlot_dot', true);

                points.attr({
                    d: arc,
                    transform: function (d: IDotPlotViewModel): string {
                        return `translate(${context.getX(d, xScale)},${context.getY(d, yScale)})`;
                    },
                    stroke: (d: IDotPlotViewModel): string =>
                    this.rangeConfig.style === 'solid' ? this.rangeConfig.borderColor : dotPlotUtils.getColor(this.rangeConfig, d),
                    'stroke-width': 2,
                    'fill-opacity': (100 - this.rangeConfig.transparency) / 100,
                    'stroke-opacity': (100 - this.rangeConfig.transparency) / 100
                });
                points.exit().remove();
            }

            // Gradient logic
            if (!Visual.isGradientPresent) {
                points.attr({ fill: (d: IDotPlotViewModel): string =>
                    this.rangeConfig.style === 'solid' ? dotPlotUtils.getColor(this.rangeConfig, d) : 'none' });
            } else {
                let minGradientValue: number = 9999999999999;
                let maxGradientValue: number = -9999999999999;

                this.categoryColorData.forEach((element: number) => {
                    if (element < minGradientValue) {
                        minGradientValue = element;
                    }
                    if (element > maxGradientValue) {
                        maxGradientValue = element;
                    }
                });
                this.colorScale = d3.scale.linear()
                    .domain([minGradientValue, maxGradientValue])
                    .range([0, 1]);
                this.getGradColor = d3.interpolateRgb(this.gradientSetting.minColor, this.gradientSetting.maxColor);
                if (this.rangeConfig.style === 'solid') {
                    points.attr('fill', function (d: IDotPlotViewModel): string {
                        return visualContext.getGradColor(visualContext.colorScale(parseFloat(d.categoryColor)));
                    });
                } else {
                    points.attr('fill', 'none');
                    points.attr('stroke', function (d: IDotPlotViewModel): string {
                        return visualContext.getGradColor(visualContext.colorScale(parseFloat(d.categoryColor)));
                    });
                }
            }
        }

        public addLegendSelection(): void {
            const visualContext: this = this;
            const dots: d3.Selection<IDotPlotViewModel> = d3.selectAll('.dotPlot_dot');
            // tslint:disable-next-line:no-any
            const legends: d3.Selection<any> = d3.selectAll('.legendItem');
            const selectionManager: ISelectionManager = this.selectionManager;
            // tslint:disable-next-line:no-any
            legends.on('click', function (d: any): void {
                const index: number = visualContext.color.indexOf(d.tooltip.toString());
                if (index === -1) {
                    visualContext.color.push(d.tooltip.toString());
                } else {
                    visualContext.color.splice(index, 1);
                }
                visualContext.selectionManager.select(d.identity, true).then((ids: ISelectionId[]) => {
                    dots.attr('fill-opacity' , function (dot: IDotPlotViewModel): number {
                        if (ids.length && (visualContext.color.indexOf(dot.categoryColor) === -1 && ids.indexOf(dot.selectionId) === -1)) {
                            return 0.15;
                        } else {
                            return 0.9;
                        }
                    });
                    dots.attr('stroke-opacity' , function (dot: IDotPlotViewModel): number {
                        if (ids.length && (visualContext.color.indexOf(dot.categoryColor) === -1 && ids.indexOf(dot.selectionId) === -1)) {
                            return 0.15;
                        } else {
                            return 0.9;
                        }
                    });
                    // tslint:disable-next-line:no-any
                    legends.attr('fill-opacity', function (legend: any): number {
                        if (legend && legend.tooltip &&
                            visualContext.color &&
                            visualContext.color.length &&
                            visualContext.color.indexOf(legend.tooltip.toString()) === -1) {
                            return 0.15;
                        } else {
                            return 1;
                        }
                    });

                    if (ids.length) {
                        visualContext.clickFlag = true;
                    } else {
                        dots.attr('stroke',  (i: IDotPlotViewModel): string =>
                                visualContext.rangeConfig.style === 'solid' ?
                                    visualContext.rangeConfig.borderColor :
                                    dotPlotUtils.getColor(visualContext.rangeConfig, i))
                            .attr('fill-opacity', (100 - visualContext.rangeConfig.transparency) / 100)
                            .attr('stroke-opacity', (100 - visualContext.rangeConfig.transparency) / 100);
                        visualContext.clickFlag = false;
                    }
                });
                (<Event>d3.event).stopPropagation();
            });
        }

        public renderLegend(dataViews: DataView, legendConfig: ILegendConfig, isScrollPresent: boolean): void {
            if (!Visual.legendDataPoints && Visual.legendDataPoints.length) { return; }
            const sTitle: string = '';
            let legendObjectProperties: DataViewObject;
            if (dataViews && dataViews.metadata) {
                legendObjectProperties = powerbi
                    .extensibility
                    .utils
                    .dataview
                    .DataViewObjects
                    .getObject(dataViews.metadata.objects, 'legend', {});
            }

            let legendData: ILegendDataPoint[];
            legendData = Visual.legendDataPoints;
            const legendDataTorender: utils.chart.legend.LegendData = {
                dataPoints: [],
                fontSize: legendConfig.fontSize,
                labelColor: legendConfig.labelColor,
                title: Visual.legendTitle
            };

            for (const iCounter of legendData) {
                legendDataTorender.dataPoints.push({
                    color: iCounter.color,
                    icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Box,
                    identity: iCounter.identity,
                    label: iCounter.category,
                    selected: iCounter.selected
                });
            }
            if (legendObjectProperties) {
                powerbi.extensibility.utils.chart.legend.data.update(legendDataTorender, legendObjectProperties);
                const position: string = <string>legendObjectProperties[powerbi.extensibility.utils.chart.legend.legendProps.position];
                if (position) { Visual.legend.changeOrientation(powerbi.extensibility.utils.chart.legend.LegendPosition[position]); }

            }

            const legendOrient: LegendPosition = Visual.legend.getOrientation();
            const legendViewport: IViewport = _.clone(this.viewport);
            switch (legendOrient) {
                case 0:
                case 1:
                    if (!isScrollPresent) {
                        legendViewport.width = legendViewport.width / 2;
                    }
                    break;
                case 2:
                case 3:
                    if (!isScrollPresent) {
                        legendViewport.height = legendViewport.height / 2;
                    }
                    break;
                default:
                    break;
            }

            Visual.legend.drawLegend(
                legendDataTorender,
                ({ width: legendViewport.width, height: legendViewport.height })
            );
            powerbi.extensibility.utils.chart.legend.positionChartArea(this.baseContainer, Visual.legend);
            if (this.baseContainer.style('margin-top')) {
                const value: number = parseFloat(this.baseContainer.style('margin-top')
                    .substr(0, this.baseContainer.style('margin-top').length - 2));
                this.baseContainer.style('margin-top', `${value + 2}px`);
            }
        }

        public renderSizeLegend(
            sizeLegendHeight: number,
            legendOrient: LegendPosition,
            isScrollPresent: boolean,
            dataSizeValues: number[],
            legendSetting: ILegendConfig,
            sizeLegendWidth: number,
            options: VisualUpdateOptions): void {
            const sizeLegendTitleText: string = this.legendDotTitle ? this.legendDotTitle : '';
            let measureTextProperties: TextProperties = {
                fontFamily: legendSetting.fontFamily,
                fontSize: dotPlotUtils.pointToPixel(legendSetting.fontSize),
                text: sizeLegendTitleText
            };

            const legendCircles: d3.Selection<SVGElement> = this.legendDotSvg
                .append('g')
                .classed('dotPlot_categorySize', true);

            if (legendOrient === 0 || legendOrient === 1) {
                const sizeArray: {
                    cX: number;
                    r: number;
                }[] = [{
                    cX: 0,
                    r: 0
                }];
                let cX: number = 0 + 10;
                let radius: number = 0;
                for (let iCounter: number = 0; iCounter < 6; iCounter++) {
                    radius = 2 + (iCounter * (Number(sizeLegendHeight) / 30)); // 2 was taken to have minimum circle visible
                    cX = cX + (radius * 2) + 5 + iCounter * 1; // 5 is distance between circles
                    const obj: {
                        cX: number;
                        r: number;
                    } = {
                            cX: cX,
                            r: radius
                        };
                    sizeArray.push(obj);
                }
                for (let iCounter: number = 1; iCounter < sizeArray.length; iCounter++) {
                    legendCircles.append('circle')
                        .classed('dotPlot_legendDot', true)
                        .attr({
                            cx: sizeArray[iCounter].cX,
                            cy: radius + Number(sizeLegendHeight) / 7,
                            fill: legendSetting.sizeLegendColor,
                            r: sizeArray[iCounter].r
                        });
                }
                const legendDotData: number[] = [];
                const legendFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                    format: this.sizeFormat,
                    value: legendSetting.displayUnits === 0 ? dotPlotUtils.returnMax(dataSizeValues, true) : legendSetting.displayUnits,
                    precision: legendSetting.decimalPlaces
                });
                const legendTooltipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                    format: valueFormatter.DefaultNumericFormat
                });
                // Push minimum and maximum category size values in this array
                legendDotData.push(dotPlotUtils.returnMin(dataSizeValues, true));
                legendDotData.push(dotPlotUtils.returnMax(dataSizeValues, true));

                for (let iCount: number = 0; iCount < 2; iCount++) {
                    let x: number = 0; let y: number = 0;
                    if (iCount === 0) {
                        x = sizeArray[1].cX;
                    } else {
                        x = sizeArray[sizeArray.length - 1].cX;
                    }
                    y = (radius * 2) + Number(sizeLegendHeight) / 2;
                    const textProperties: TextProperties = {
                        fontFamily: legendSetting.fontFamily,
                        fontSize: `${sizeLegendHeight / 2.5}px`,
                        text: legendFormatter.format(legendDotData[iCount])
                    };
                    legendCircles.append('text')
                        .classed('dotPlot_legendDotText', true)
                        .attr({
                            fill: legendSetting.labelColor,
                            x: x,
                            y: y
                        })
                        .style({
                            'font-size': `${sizeLegendHeight / 2.5}px`,
                            'font-family': legendSetting.fontFamily,
                            'text-anchor': 'middle'
                        }).text(textMeasurementService.getTailoredTextOrDefault(textProperties, 40))
                        .append('title')
                        .text(legendTooltipFormatter.format(legendDotData[iCount]));
                }
                const totalWidth: number = sizeArray[sizeArray.length - 1].cX - sizeArray[0].cX + 10;

                // Size legend title
                const sizeLegendTitleUpdatedText: string = textMeasurementService
                    .getTailoredTextOrDefault(
                    measureTextProperties,
                    (isScrollPresent ? options.viewport.width : options.viewport.width / 2) - totalWidth - 20
                    );

                measureTextProperties = {
                    fontFamily: legendSetting.fontFamily,
                    fontSize: dotPlotUtils.pointToPixel(legendSetting.fontSize),
                    text: sizeLegendTitleUpdatedText
                };

                const sizeLegendTitleWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);

                const legendDotText: d3.Selection<SVGElement> = this.legendDotSvg
                    .append('g')
                    .classed('dotPlot_legendCategory', true)
                    .append('text')
                    .text(sizeLegendTitleUpdatedText)
                    .style({
                        'font-size': dotPlotUtils.pointToPixel(legendSetting.fontSize),
                        'font-family': legendSetting.fontFamily
                    });
                legendDotText.attr({
                    fill: legendSetting.labelColor,
                    x: 2,
                    y: 9 + parseFloat(this.legendSetting.fontSize.toString())
                })
                    .append('title')
                    .text(sizeLegendTitleText);
                if (!isScrollPresent) {
                    legendDotText
                        .attr('transform', `translate(${(isScrollPresent ?
                            options.viewport.width : options.viewport.width / 2) - totalWidth - 20 - sizeLegendTitleWidth}, 0)`);
                    legendCircles
                        .attr('transform', `translate(${(isScrollPresent ?
                            options.viewport.width : options.viewport.width / 2) - totalWidth - 10},0)`);
                } else {
                    legendCircles
                        .attr('transform', `translate(${sizeLegendTitleWidth},0)`);
                }
            } else if ((legendOrient === 2 || legendOrient === 3) && !isScrollPresent) {
                const sizeArray: {
                    cY: number;
                    r: number;
                }[] = [{
                    cY: 0,
                    r: 0
                }];
                let cY: number = 25;
                let radius: number = 0;
                for (let iCounter: number = 0; iCounter < 6; iCounter++) {
                    radius = 2 + (iCounter * (Number(sizeLegendWidth) / 80)); // 3 was taken to have minimum circle visible
                    cY = cY + (radius * 2) + 3 + iCounter * 1; // 5 is distance between circles
                    const obj: {
                        cY: number;
                        r: number;
                    } = {
                            cY: cY,
                            r: radius
                        };
                    sizeArray.push(obj);
                }
                for (let iCounter: number = 1; iCounter < sizeArray.length; iCounter++) {
                    legendCircles.append('circle')
                        .classed('dotPlot_legendDot', true)
                        .attr({
                            cx: radius + Number(sizeLegendWidth) / 7,
                            cy: sizeArray[iCounter].cY,
                            fill: legendSetting.sizeLegendColor,
                            r: sizeArray[iCounter].r
                        });
                }
                const legendDotData: number[] = [];
                const legendFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                    format: this.sizeFormat,
                    value: legendSetting.displayUnits === 0 ? dotPlotUtils.returnMax(dataSizeValues, true) : legendSetting.displayUnits,
                    precision: legendSetting.decimalPlaces
                });
                const legendTooltipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                    format: valueFormatter.DefaultNumericFormat
                });
                // Push minimum and maximum category size values in this array
                legendDotData.push(dotPlotUtils.returnMin(dataSizeValues, true));
                legendDotData.push(dotPlotUtils.returnMax(dataSizeValues, true));

                for (let iCount: number = 0; iCount < 2; iCount++) {
                    let x: number = 0; let y: number = 0;
                    if (iCount === 0) {
                        y = sizeArray[1].cY + 5;
                    } else {
                        y = sizeArray[sizeArray.length - 1].cY + 5;
                    }
                    x = (radius) + Number(sizeLegendWidth) / 2;
                    const textProperties: TextProperties = {
                        fontFamily: legendSetting.fontFamily,
                        fontSize: `${sizeLegendWidth / 6}px`,
                        text: legendFormatter.format(legendDotData[iCount])
                    };
                    legendCircles.append('text')
                        .classed('dotPlot_legendDotText', true)
                        .attr({
                            fill: legendSetting.labelColor,
                            x: x,
                            y: y
                        })
                        .style({
                            'font-size': `${sizeLegendWidth / 8}px`,
                            'font-family': legendSetting.fontFamily,
                            'text-anchor': 'middle'
                        })
                        .text(textMeasurementService.getTailoredTextOrDefault(textProperties, ((radius) + Number(sizeLegendWidth) / 2)))
                        .append('title')
                        .text(legendTooltipFormatter.format(legendDotData[iCount]));
                }
                const totalHeight: number = sizeArray[sizeArray.length - 1].cY - sizeArray[0].cY + 10;
                legendCircles.attr('transform', `translate(0, ${options.viewport.height / 2 - totalHeight})`);

                // Size legend title
                const sizeLegendTitleUpdatedText: string = textMeasurementService
                    .getTailoredTextOrDefault(measureTextProperties, parseFloat(d3.select('.legend').style('width')));

                measureTextProperties = {
                    fontFamily: legendSetting.fontFamily,
                    fontSize: dotPlotUtils.pointToPixel(legendSetting.fontSize),
                    text: sizeLegendTitleUpdatedText
                };

                const sizeLegendTitleHeight: number = textMeasurementService.measureSvgTextHeight(measureTextProperties);

                const legendDotText: d3.Selection<SVGElement> = this.legendDotSvg
                    .append('g')
                    .classed('dotPlot_legendCategory', true)
                    .append('text')
                    .text(sizeLegendTitleUpdatedText)
                    .style({
                        'font-size': dotPlotUtils.pointToPixel(legendSetting.fontSize),
                        'font-family': legendSetting.fontFamily
                    });

                legendDotText.attr({
                    fill: legendSetting.labelColor,
                    x: 2,
                    y: 0
                })
                    .append('title')
                    .text(sizeLegendTitleText);

                legendDotText
                    .attr('transform', `translate(5,${(options.viewport.height / 2) - totalHeight - sizeLegendTitleHeight + 20})`);
            }
        }

        // tslint:disable-next-line:no-any
        public getTooltipData(value: any): VisualTooltipDataItem[] {

            const tooltipDataPoints: VisualTooltipDataItem[] = [];
            for (const iCounter of value.tooltipData) {
                const tooltipData: VisualTooltipDataItem = {
                    displayName: '',
                    value: ''
                };
                tooltipData.displayName = iCounter.name;
                tooltipData.value = iCounter.value;
                tooltipDataPoints.push(tooltipData);
            }

            return tooltipDataPoints;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const objectName: string = options.objectName;
            const objectEnumeration: VisualObjectInstance[] = [];
            const parentAxisConfigs: IParentAxisSettings = this.parentAxisConfigs;
            const flipSetting: IFlipSettings = this.flipSetting;
            const sortSetting: ISortSettings = this.sortSetting;
            const highlightSetting: IHighlightSettings = this.highlightSetting;
            const jitterSettings: IJitterSettings = this.jitterSetting;
            const yAxisConfigs: IAxisSettings = this.yAxisConfig;
            const xAxisConfigs: IAxisSettings = this.xAxisConfig;
            const rangeSetting: IRangeSettings = this.rangeConfig;
            const legendConfig: ILegendConfig = this.legendSetting;
            const gradientSelectorSetting: IGradientSelectorSettings = this.gradientSetting;
            const backgroundSetting: IBackgroundSettings = this.backgroundSetting;
            const gridLinesSetting: IGridLinesSettings = this.gridLinesSetting;
            const tickSetting: ITickSettings = this.tickSetting;

            switch (objectName) {
                case 'parentAxis':
                    enumSettings.enumerateParentAxis(parentAxisConfigs, objectEnumeration, objectName);
                    break;
                case 'backgroundBanding':
                    enumSettings.enumerateBackgroundBanding(backgroundSetting, objectEnumeration, objectName, xAxisConfigs);
                    break;
                case 'gridLines':
                    enumSettings.enumerateGridLines(gridLinesSetting, objectEnumeration, objectName, xAxisConfigs);
                    break;
                case 'tickMarks':
                    enumSettings.enumerateTickMarks(tickSetting, objectEnumeration, objectName);
                    break;
                case 'yAxis':
                    enumSettings.enumerateYAxis(yAxisConfigs, objectEnumeration, objectName, flipSetting);
                    break;
                case 'xAxis':
                    enumSettings.enumerateXAxis(xAxisConfigs, objectEnumeration, objectName, flipSetting);
                    break;
                case 'legend':
                    enumSettings.enumerateLegend(legendConfig, objectEnumeration, objectName);
                    break;
                case 'colorSelector':
                    enumSettings.enumerateColorSelector(objectEnumeration, objectName);
                    break;
                case 'gradientSelector':
                    enumSettings.enumerateGradientSelector(gradientSelectorSetting, objectEnumeration, objectName);
                    break;
                case 'RangeSelector':
                    enumSettings.enumerateRangeSelector(rangeSetting, objectEnumeration, objectName);
                    break;
                case 'flip':
                    enumSettings.enumerateFlip(flipSetting, objectEnumeration, objectName);
                    break;
                case 'sort':
                    enumSettings.enumerateSort(sortSetting, objectEnumeration, objectName);
                    break;
                case 'highlight':
                    enumSettings.enumerateHighlight(highlightSetting, objectEnumeration, objectName);
                    break;
                case 'jitter':
                    enumSettings.enumerateJitter(jitterSettings, objectEnumeration, objectName);
                    break;
                default:
            }

            return objectEnumeration;
        }
    }
}
