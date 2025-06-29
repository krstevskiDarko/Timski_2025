   // @charset "UTF-8";
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
      document.getElementById('animal-select').value = '';
      document.getElementById('service-select').value = '';
    }

    d3.json('http://localhost:3000/api/clinics')
      .then((data) => {
        const clinics = [], citySet = new Set(), animalSet = new Set(), serviceSet = new Set(), collaborationSet = new Set;
          data.forEach(({ id, name, location, type, latitude, longitude, address, animalSpecializations, collaborations, services }) => {
          if (latitude && longitude) {
            clinics.push({ id, name, location, type, latitude, longitude, address, animalSpecializations, collaborations, services });
            citySet.add(location);
            (animalSpecializations || []).forEach(a => {
                if (a) animalSet.add(a);
            });
            (services || []).forEach(s => {
                if (s) serviceSet.add(s);
            });
            (collaborations || []).forEach(c => {
                if (c) collaborationSet.add(c);
            });
          }
        });

        d3.select('#city-select').html('<option value="">Сите општини</option>');
        [...citySet].sort().forEach((city) => {
          d3.select('#city-select').append('option').text(city).attr('value', city);
        });

        ['Амбуланта', 'Болница', 'Клиника'].forEach((type) => {
          d3.select('#type-select').append('option').text(type).attr('value', type);
        });

        [...animalSet].sort().forEach((a) => {
            d3.select('#animal-select').append('option').text(a).attr('value', a);
        });

        [...serviceSet].sort().forEach((s) => {
            d3.select('#service-select').append('option').text(s).attr('value', s);
        });

          const markers = L.layerGroup().addTo(map);

          function updateMarkers(city, type,  animal, service) {
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

              if (animal) {
                  filtered = filtered.filter(c => Array.isArray(c.animalSpecializations) && c.animalSpecializations.includes(animal));
              }

              if (animal === 'Рептили') {
                  filtered = filtered.filter(c => !c.services.includes('Груминг'));
              }

              if (service) {
                  filtered = filtered.filter(c => Array.isArray(c.services) && c.services.includes(service));
              }

              filtered.forEach(clinic => {
                  const popup = `
              <strong>${clinic.name}</strong><br>${clinic.address}<br>
              <button class="btn btn-sm btn-primary mt-2" onclick="onFindPathClick(${clinic.latitude}, ${clinic.longitude})">Најди пат</button>
            `;
                  L.marker([clinic.latitude, clinic.longitude]).addTo(markers).bindPopup(popup);
              });

              filtered.forEach(clinic => {
                  const popup = `
          <strong>${clinic.name}</strong><br>${clinic.address}<br>
          <button class="btn btn-sm btn-primary mt-2" onclick="onFindPathClick(${clinic.latitude}, ${clinic.longitude})">Најди пат</button>
          ${clinic.collaborations && clinic.collaborations.length ? `
            <button class="btn btn-sm btn-secondary mt-2" onclick="showCollaborations(${clinic.id})">Работи заедно со</button>
          ` : ''}
        `;
                  L.marker([clinic.latitude, clinic.longitude]).addTo(markers).bindPopup(popup);
              });


              document.getElementById('clinic-count').textContent = filtered.length;
          }

          window.showCollaborations = (id) => {
              const clinic = clinics.find(c => c.id == id);
              const modalBody = document.getElementById('collaborations-modal-body');
              if (clinic && clinic.collaborations && clinic.collaborations.length) {
                  const names = clinic.collaborations
                      .map(cid => {
                          const collabClinic = clinics.find(c => c.id == cid);
                          return collabClinic ? collabClinic.name : null; // skip if no match
                      })
                      .filter(name => name !== null);
                  if (names.length > 0) {
                      modalBody.innerHTML = '<ul>' + names.map(n => `<li>${n}</li>`).join('') + '</ul>';
                  } else {
                      modalBody.textContent = 'Нема информации за соработка.';
                  }
              } else {
                  modalBody.textContent = 'Нема информации за соработка.';
              }
              const modal = new bootstrap.Modal(document.getElementById('collaborationsModal'));
              modal.show();
          };

          function getSelected(id) {
              return d3.select(id).property('value');
          }


          d3.selectAll('#city-select, #type-select, #animal-select, #service-select').on('change', () =>
              updateMarkers(
                  getSelected('#city-select'),
                  getSelected('#type-select'),
                  getSelected('#animal-select'),
                  getSelected('#service-select')
              )
          );

        clearRouteBtn.addEventListener('click', resetRoute);
        updateMarkers();
      })
      .catch(err => console.error('Error loading data:', err));
