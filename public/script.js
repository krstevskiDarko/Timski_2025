
    const map = L.map('map').setView([41.6082, 21.7453], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    let routingControl = null;
    const clearRouteBtn = document.getElementById('clear-route-btn');

    function onFindPathClick(lat, lng) {
      if (!navigator.geolocation) {
        alert('Вашиот пребарувач не поддржува геолокација.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLatLng = [pos.coords.latitude, pos.coords.longitude];
          if (routingControl) {
            map.removeControl(routingControl);
          }

          routingControl = L.Routing.control({
            waypoints: [
              L.latLng(userLatLng),
              L.latLng(lat, lng),
            ],
            routeWhileDragging: false,
            lineOptions: { styles: [{ color: 'blue', opacity: 0.6, weight: 5 }] },
          }).addTo(map);

          clearRouteBtn.style.display = 'block';
        },
        (err) => {
          alert('Не можеме да ја добиеме вашата локација: ' + err.message);
        }
      );
    }

    function resetRoute() {
      if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
      }
      clearRouteBtn.style.display = 'none';
      document.getElementById('city-select').value = '';
      document.getElementById('type-select').value = '';
      updateMarkers();
    }

    d3.json('http://localhost:3000/api/clinics')
      .then((data) => {
        const clinics = [], citySet = new Set();
        data.forEach(({ id, name, location, type, latitude, longitude, address }) => {
          if (latitude && longitude) {
            clinics.push({ id, name, location, type, latitude, longitude, address });
            citySet.add(location);
          }
        });

        d3.select('#city-select').html('<option value="">Сите општини</option>');
        [...citySet].sort().forEach((city) => {
          d3.select('#city-select').append('option').text(city).attr('value', city);
        });

        ['Амбуланта', 'Болница', 'Клиника'].forEach((type) => {
          d3.select('#type-select').append('option').text(type).attr('value', type);
        });

        const markers = L.layerGroup().addTo(map);

        function updateMarkers(city, type) {
          markers.clearLayers();
          let filtered = clinics;

          if (city) filtered = filtered.filter(c => c.location === city);

          if (type) {
            filtered = filtered.filter(c => {
              const t = c.type.toLowerCase();
              if (type === 'Амбуланта') return t.includes('амбуланта');
              if (type === 'Клиника') return t.includes('клиника');
              if (type === 'Болница') return t.includes('болница') || t.includes('станица');
              return t === type.toLowerCase();
            });
          }

          filtered.forEach(clinic => {
            const popup = `
              <strong>${clinic.name}</strong><br>${clinic.address}<br>
              <button class="btn btn-sm btn-primary mt-2" onclick="onFindPathClick(${clinic.latitude}, ${clinic.longitude})">Најди пат</button>
            `;
            L.marker([clinic.latitude, clinic.longitude]).addTo(markers).bindPopup(popup);
          });

          document.getElementById('clinic-count').textContent = filtered.length;
        }

        d3.select('#city-select').on('change', () =>
          updateMarkers(d3.select('#city-select').property('value'), d3.select('#type-select').property('value'))
        );
        d3.select('#type-select').on('change', () =>
          updateMarkers(d3.select('#city-select').property('value'), d3.select('#type-select').property('value'))
        );

        clearRouteBtn.addEventListener('click', resetRoute);
        updateMarkers();
      })
      .catch(err => console.error('Error loading data:', err));
