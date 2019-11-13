let server = 'https://dev.ropensci.org';

function get_path(path){
	return new Promise(function(resolve, reject) {
		$.get(server + path).done(function(txt){
			resolve(txt);
		}).fail((jqXHR, textStatus) => reject("GET " + path + "\nHTTP " + jqXHR.status + "\n\n" + jqXHR.responseText));
	});	
}

function get_json(path){
	return get_path(path);
}

function get_ndjson(path){
	return get_path(path).then(txt => txt.split('\n').filter(x => x.length).map(JSON.parse));
}

function td(el){
	return $('<td>').append(el);
}

function tr(list){
	var tr = $('<tr>');
	list.forEach(x => tr.append(td(x)))
	return tr;
}

function href(doc){
	if(doc){
		return $('<a>').text(doc.status).attr('href', doc.url);
	}
}

function run_icon(run){
	var iconmap = {
		src : "linux",
		win : "windows",
		mac : "apple"
	};
	if(run && run.builder){
		var i = $("<i>", {class : 'fa fa-' + iconmap[run.type]});
		var a = $("<a>").attr('href', run.builder.url).append(i);
		if(run.builder.status != 'Succeeded'){
			a.css('color', 'red');
		}
		return $('<span></span>').append(a);
	}
}

function docs_icon(job){
	var i = $("<i>", {class : 'fa fa-book'});
	var a = $("<a>").attr('href', job.url).append(i);
	if(job.color == 'red'){
		a.css('color', 'red');
	}
	return $('<span></span>').append(a);
}

function make_sysdeps(builder){
	if(builder.sysdeps){
		var div = $("<div>");
		var deps = builder.sysdeps.split(/,\s*/);
		deps.forEach(function(x){
			var name = x.split(" ")[0];
			var rest = x.split(" ")[1].replace(/[0-9.]+:/, '').replace(/[+-].*\)/, ')');
			var url = 'https://packages.debian.org/testing/' + name;
			$("<a>").text(name).attr("href", url).appendTo(div);
			div.append(" " + rest + "\t");

		});
		return div;
	}
}

$(function(){
	let tbody = $("tbody");
	var packages = {};
	get_json('/api/json').then(function(jenkins){
		jenkins.jobs.forEach(function(job){
			packages[job.name] = job;
		});
		get_ndjson('/stats/checks').then(function(cranlike){
			cranlike.forEach(function(x){
				packages[x.package].cranlike = x;
			});
			Object.keys(packages).forEach(function(name){
				var info = packages[name];
				var cranlike = info.cranlike;
				if(!cranlike){
					tbody.append(tr(["", name, "", "", docs_icon(info), "", "", "", ""]));
				} else {
					var src = cranlike.runs && cranlike.runs.find(x => x.type == 'src') || {};
					var win = cranlike.runs && cranlike.runs.find(x => x.type == 'win') || {};
					var mac = cranlike.runs && cranlike.runs.find(x => x.type == 'mac') || {};
					//var date = src && new Date(src.date);
					var date = src && src.date.substring(0, 10);
					var sysdeps = src && make_sysdeps(src.builder);
					tbody.append(tr([date, cranlike.package, cranlike.version, cranlike.maintainer, docs_icon(info), run_icon(win), run_icon(mac), run_icon(src), sysdeps]));
				}
			});
		}).catch(alert).then(function(x){
			var defs = [{
				targets: [4, 5, 6, 7],
				className: 'dt-body-center'
			}];
			$("table").DataTable({paging: false, fixedHeader: true, columnDefs: defs, order: [[ 0, "desc" ]]});
			//$('div.dataTables_filter').appendTo("thead").css('margin-bottom', '-80px').css('padding', 0).css('float', 'right');
		});
	});
});
