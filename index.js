
var pitch_classes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'A♭', 'A', 'B♭', 'B'];
function parameterCompare(left, right, key){
  if (left[key] < right[key]){return -1;}
  if (left[key] > right[key]){return 1;}
  return 0;
}
function unixTime(){return Math.floor(Date.now() / 1000);}
function getQueryParams(qs) {
    qs = qs.split('+').join(' ');
    var params = {},tokens,re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);} return params;
}

function checkToken(){
    current = unixTime();
    if((current - localStorage.getItem('last_timestamp')) > localStorage.getItem('expires_in')){
        refreshToken();
    }
}

var getTrackByID = function(id){
    for (var index in window.top50.items){
        track = window.top50.items[index];
        if(track.id === id){
            return track;
        }
    }
};

var refreshToken = function(){
    fetch("https://zi5y9tz7b6.execute-api.us-east-1.amazonaws.com/prod/refresh", {method: 'POST', body: JSON.stringify({
        'refresh_token': localStorage.getItem('refresh_token')
    })}).then(function(response){
        return response.json();
    }).then(function(raw){
        var obj = JSON.parse(raw);
        console.log(obj);
        localStorage.setItem('access_token', obj.access_token);
        localStorage.setItem('refresh_token', obj.refresh_token);
        localStorage.setItem('last_timestamp', unixTime());
        localStorage.setItem('expires_in', obj.expires_in);
    });
};

var auth = new Promise(function(resolve, reject){
    query = getQueryParams(document.location.search);

    fetch("https://zi5y9tz7b6.execute-api.us-east-1.amazonaws.com/prod/auth", {method: 'POST', body: JSON.stringify({
        'code': query.code
    })}).then(function(response){
        return response.json();
    }).then(function(raw){
        var obj = JSON.parse(raw);
        // console.log(obj);
        localStorage.setItem('access_token', obj.access_token);
        localStorage.setItem('refresh_token', obj.refresh_token);
        localStorage.setItem('last_timestamp', unixTime());
        localStorage.setItem('expires_in', obj.expires_in);
        resolve(obj.access_token);
    }).catch(function(){
        reject('The request failed. Sad!');
    });

});

var multisort = function(sample){
    console.log(sample);
    sample = sample.audio_features;
    window.danceable = sample.slice();
    window.fastest = sample.slice();
    window.happiness = sample.slice();
    window.key = sample.slice();

    window.danceable.sort(function(a,b){
        return parameterCompare(a,b,'danceability');
    });
    window.fastest.sort(function(a,b){
        return parameterCompare(a,b,'tempo');
    });
    window.happiness.sort(function(a,b){
        return parameterCompare(a,b,'valence');
    });
    window.key.sort(function(a,b){
        return parameterCompare(a,b,'key');
    });
}

var attach_to_dom = function(songs){
    window.top50 = songs;

    var trackDataURL = '/audio-features?ids='

    var vuetest = new Vue({
      el: '#vuetest',
      data: {
        tracks: songs.items.slice(0,10)
      }
    });

    for (var index in songs.items){
        var track = songs.items[index];
        trackDataURL = trackDataURL.concat(track.id + ',');
    }
    api(trackDataURL, multisort);
}

var api = function(endpoint, callback){
    checkToken();

    fetch("https://zi5y9tz7b6.execute-api.us-east-1.amazonaws.com/prod/api", {method: 'POST', body: JSON.stringify({
        'endpoint': 'v1' + endpoint,
        'auth': localStorage.getItem('access_token')
    })}).then(function(response){
        return response.json();
    }).then(function(raw){
        var obj = JSON.parse(raw);
        callback(obj);
    });
};

query = getQueryParams(document.location.search);
if(query.code){
    var del = document.getElementById('delet_this');
    del.parentNode.removeChild(del);
    var content = document.getElementById('main');
    content.style.display = "block";
}

auth.then(function(){
    api('/me/top/tracks?limit=50', attach_to_dom);
}).catch(function(error){
    console.log('Sad!');
});
