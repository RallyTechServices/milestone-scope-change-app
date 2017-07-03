var scope_change_chart = null;

Ext.define('Rally.technicalservices.scopeChangeChart',{
    extend: 'Rally.ui.chart.Chart',
    alias: 'widget.progresschart',

    itemId: 'rally-chart',
    chartData: {

    },
    loadMask: false,
    // chartColors : ["#E0E0E0","#00a9e0","#009933","#E0E0E0","#00a9e0","#009933"],
    chartColors : ["#CCCCCC","#00a9e0","#009933","#CCCCCC","#00a9e0","#009933"],
    
    chartConfig: {
        // colors : ["#E0E0E0","#00a9e0","#fad200","#8dc63f"],
        chart: {
            type: 'column',
            zoomType: 'xy'
        },
        title: {
            text: 'Milestone Scope Change Chart'
        },
        // subtitle: {
        //     text: ''
        // },
        xAxis: {
            title: {
                enabled : true,
                text: 'Day'
            },
            startOnTick: true,
            //endOnTick: true,
            min : 1
        },
        yAxis: [
            {
                title: {
                    text: 'Points/Count'
                },
                plotLines : [{
                    color: '#000000',
                    width: 1,
                    value: 0,
                    zIndex : 4,
                    label : {text:"-"}
                }]
            }],

        tooltip : {
            useHTML: true,
            formatter : function() {
                var that = this;
                var totaldays = that.series.data.length;
                // console.log(this);
                var pointVal = function(series) {
                    var val = series.data[that.point.x - 1].y;
                    return !_.isNull(val) ? (val <0 ? val*-1 : val) : 0;
                };
                var sumSeries = function(seriesContains) {
                    return _.reduce( that.series.chart.series, function(sum,series) {
                        // return sum + (series.name.includes(seriesContains) ? pointVal(series) : 0);
                        return sum + ( (series.name.indexOf(seriesContains) > -1) ? pointVal(series) : 0);
                    },0);
                };
                var getSeries = function(seriesName) {
                    return _.reduce( that.series.chart.series, function(sum,series) {
                        return sum + (series.name===seriesName ? pointVal(series) : 0);
                    },0);
                };

                var pct = function(val,total) {
                    return "" + (total > 0 ? Math.round((val/total)*100) : 0)+"%";
                }

                var labelPct = function(val,total) {
                    return "" + val + " ("+pct(val,total)+"%)";
                }

                var total = _.reduce( this.series.chart.series, function(sum,series) {
                    return sum + pointVal(series);
                },0);



                var getScopeChangeFeatures1 = function(chart,x) {

                    var that = this;

                    // aggregate the stories for all series for the selected data
                    var currentFeatures = _.compact(_.flatten(_.map(chart.series,function(s) { return s.data[x].features })));
                    var previousFeatures = _.compact(_.flatten(_.map(chart.series,function(s) { return s.data[0].features })));//that.bundle.baseline;

                    // get story ids for comparison
                    var cFeatures = _.map( currentFeatures, function(f) { return f.FormattedID; });
                    var pFeatures = _.map( previousFeatures, function(f) { return f.FormattedID; });

                    var removed = _.difference(pFeatures, cFeatures);
                    var added = _.difference(cFeatures, pFeatures);

                    var findit = function( features, fid ) {
                        return _.find( features, function(f){ return f.FormattedID === fid; });
                    }

                    var r = _.map ( removed, function(fid) { 
                        var f = findit(previousFeatures,fid);
                        f["Scope"] = "Removed";
                        return f;
                    });

                    return r;
                }



                var scopeChangeFeatures = getScopeChangeFeatures1(that.series.chart,that.point.x - 1);

                console.log('scopeChangeFeatures>>',scopeChangeFeatures);


                var getRemoved = function(state,pointsOrCount) {
                    return _.reduce( scopeChangeFeatures, function(sum,value) {

                        if(value.FormattedID.indexOf('US') > -1){
                            if(pointsOrCount == "Points"){
                                return sum + (value.ScheduleState===state ? value.PlanEstimate : 0);
                            }else{
                                return sum + (value.ScheduleState===state ? 1 : 0);
                            }                            
                        }else{
                            if(pointsOrCount == "Points"){
                                if(state == "In-Progress"){
                                    return sum + (((value.ActualStartDate != null) && (value.ActualStartDate != "")) ? value.PlanEstimate : 0);
                                }else if(state == "Completed"){
                                    return sum + (((value.ActualEndDate != null) && (value.ActualEndDate != "")) ? value.PlanEstimate : 0);
                                }else{
                                    return sum + value.PlanEstimate;
                                }
                                
                            }else{

                                if(state == "In-Progress"){
                                    return sum + (((value.ActualStartDate != null) && (value.ActualStartDate != "")) ? 1 : 0);
                                }else if(state == "Completed"){
                                    return sum + (((value.ActualEndDate != null) && (value.ActualEndDate != "")) ? 1 : 0);
                                }else{
                                    return sum + 1;
                                }                                
                                return sum + (value.ScheduleState===state ? 1 : 0);
                            }                               
                        }

                    },0);
                };

                var inprogress = sumSeries("InProgress");
                var completed = sumSeries("Completed");
                var notstarted = total - (completed+inprogress);
                var bs = getSeries("BaselineScope");
                var bsip = getSeries("BaselineScopeInProgress");
                var bsc = getSeries("BaselineScopeCompleted");
                var as = getSeries("AddedScope");
                var asip = getSeries("AddedScopeInProgress");
                var asc = getSeries("AddedScopeCompleted");

                var pointsOrCount = that.series.options.pointsOrCount || "";

                var rs = getRemoved("NotStarted",pointsOrCount);
                var rsip = getRemoved("In-Progress",pointsOrCount);
                var rsc = getRemoved("Completed",pointsOrCount) + getRemoved("Accepted",pointsOrCount);
                var tr = rs + rsip + rsc


                var ts = bs + as;
                var tip = bsip + asip;
                var tc = bsc + asc;

                var tb = bs+bsip+bsc;
                var ta = as+asip+asc;
                var tt = tb+ta;

                var tbp = pct(tb,total);
                var tsp = pct(ta,total);
                var ttp = pct(tt,total);

                var tpl = Ext.create('Ext.Template', 
                    "<table width='100%'>" + 
                        "<tr>" +
                            "<td align='center'>Day {day} of {totaldays}</td>" +
                        "</tr>" +
                    "</table>" +
                    "<table cellpadding='2'>"+
                    "<tr>"+
                        "<td align='center'> </td>"+
                        "<td align='center' style='padding-left:15px;padding-right:15px;'>Baseline</td>"+
                        "<td align='center' style='padding-left:15px;padding-right:15px;'>Added</td>"+
                        "<td align='center' style='padding-left:15px;padding-right:15px;'>Removed</td>"+
                        "<td align='center' style='padding-left:15px;padding-right:15px;'><b>Total</b></td>"+
                        "<td align='center' style='padding-left:15px;padding-right:0px;'><b>Total %</b></td>"+
                    "</tr>"+

                    "<tr>"+
                        "<td>NotStarted</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{bs}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{as}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{rs}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{ts}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:0px;'><b>{tnsp}</b></td>"+  
                    "</tr>"+

                    "<tr>"+
                        "<td>In-Progress</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{bsip}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{asip}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{rsip}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tip}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:0px;'><b>{tipp}</b></td>"+
                    "</tr>"+

                    "<tr>"+
                        "<td>Completed</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{bsc}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{asc}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'>{rsc}</td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tc}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:0px;'><b>{tcp}</b></td>"+
                    "</tr>"+

                    "<tr style='padding-top:10px;'>"+
                        "<td><b>Total</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tb}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{ta}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tr}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tt}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:0px;'><b>100%</b></td>"+
                    "</tr>"+

                     "<tr>"+
                        "<td><b>Total %</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tbp}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{tsp}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:15px;'><b>{ttp}</b></td>"+
                        "<td align='right' style='padding-left:15px;padding-right:0px;'><b> </b></td>"+
                    "</tr>"+
                    "</table>",

                    { compiled : true });

                 return tpl.apply(
                    {
                    series: that.series.name, day: that.point.x, totaldays: totaldays,value: (that.point.y<0?that.point.y*-1:that.point.y),
                    bs:(bs),bsip:bsip,bsc:bsc,
                    as:as,asip:asip,asc:asc,
                    rs:rs,rsip:rsip,rsc:rsc,
                    ts:ts,tip:tip,tc:tc,
                    tb:tb,ta:ta,tr:tr,tt:tt,
                    tbp:tbp,tsp:tsp,ttp:ttp,
                    tnsp:pct(ts,total),tipp:pct(tip,total),tcp:pct(tc,total)
                });
            }
        },


        plotOptions: {
            series : {
                point : {
                    events : {
                        click : function(a) {
                            // console.log(this);
                            scope_change_chart.fireEvent("series_click",this);
                        }
                    }
                },
                pointPadding: 0.1,
                groupPadding: 0,
                borderWidth: 0
            },
            column : {
                stacking : 'normal',
            },
        }
    },

    initComponent : function() {
        this.callParent(arguments);
        this.addEvents('series_click');
    },

    constructor: function (config) {

        // this.callParent(arguments);

        scope_change_chart = this;

        this.chartData = config.chartData;

        // console.log(config);
        
        if (config.subtitle) {
            console.log("subtitle",config.subtitle);
            this.chartConfig.subtitle = { text : config.subtitle } ;
        }
        if (config.title){
            this.chartConfig.title = config.title;
        }
        this.chartConfig.xAxis.plotLines = _.map(config.iterationIndices,function(i){
            return {
                color : '#888888',
                width : 1,
                value : i+1
            }
        });
        this.chartConfig.xAxis.plotLines.push({
                color : '#FF0000',
                width : 2,
                value : config.baselineIndex

        });
        this.callParent(arguments);

    },


});