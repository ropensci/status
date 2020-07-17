let server = 'https://dev.ropensci.org';

function get_path(path){
	return new Promise(function(resolve, reject) {
		$.get(server + path).done(function(txt){
			resolve(txt);
		}).fail((jqXHR, textStatus) => reject("GET " + path + "\nHTTP "
		   + jqXHR.status + "\n\n" + jqXHR.responseText));
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
		if(!run.builder.status.match(/succ/i)){ // can be success or Succeeded
			a.css('color', '#e05d44');
		}
		return $('<span></span>').append(a);
	}
}

function docs_icon(job){
	if(job && job.url){
		var i = $("<i>", {class : 'fa fa-book'});
		var a = $("<a>").attr('href', job.url).append(i);
		if(job.color == 'red'){
			a.css('color', '#e05d44');
		}
		return $('<span></span>').append(a);
	}
}

function make_sysdeps(builder){
	if(builder && builder.sysdeps){
		var div = $("<div>").css("max-width", "33vw");
		if(Array.isArray(builder.sysdeps)){
			builder.sysdeps.forEach(function(x){
				var name = x.package;
				//var url = 'https://packages.debian.org/testing/' + name;
				var distro = builder.distro;
				if(distro == "$(OS_DISTRO)")
					distro = 'bionic'
				var url = 'https://packages.ubuntu.com/' + distro + '/' + name;
				$("<a>").text(name).attr("href", url).appendTo(div);
				var version = x.version.replace(/[0-9.]+:/, '').replace(/[+-].*/, '');
				div.append(" (" + version + ")\t");
			});
		} else {
			div.append(builder.sysdeps);
		}
		return div;
	}
}

Date.prototype.yyyymmdd = function() {
	if(!isNaN(this.getTime())){
		var yyyy = this.getFullYear();
		var mm = this.getMonth() + 1; // getMonth() is zero-based
		var dd = this.getDate();
		return [yyyy, (mm>9 ? '' : '0') + mm, (dd>9 ? '' : '0') + dd].join('-');
	}
};

$(function(){
	let tbody = $("tbody");
	var jobs = {};
	get_json('/api/json').then(function(jenkins){
		jenkins.jobs.forEach(function(x){
			jobs[x.name.toLowerCase()] = x;
		});
		get_ndjson('/stats/checks').then(function(cranlike){
			cranlike.forEach(function(pkg){
				var name = pkg.package;
				var info = jobs[name.toLowerCase()] || {};
				var src = pkg.runs && pkg.runs.find(x => x.type == 'src') || {};
				var win = pkg.runs && pkg.runs.find(x => x.type == 'win') || {};
				var mac = pkg.runs && pkg.runs.find(x => x.type == 'mac') || {};
				var date = (new Date(pkg.runs[0].builder && pkg.runs[0].builder.timestamp * 1000 || pkg.runs[0].date)).yyyymmdd();
				var sysdeps = make_sysdeps(src.builder);
				tbody.append(tr([date, pkg.package, pkg.version, pkg.maintainer,
					docs_icon(info), run_icon(win), run_icon(mac), run_icon(src), sysdeps]));
				
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
