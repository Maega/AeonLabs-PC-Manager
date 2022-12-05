const $ = require('jquery');
const queryString = location.search.substring(1);
const query = JSON.parse('{"' + queryString.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });

const targetApp = JSON.parse(query.target);
$('#progress').attr('value', query.progress);
$('#progress').attr('max', query.total);

$('#currentImg').attr('src', targetApp.img);
$('#currentStage').text(`Installing ${targetApp.name}...`);