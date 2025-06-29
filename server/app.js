const express = require('express');
const basex = require('basex');
const cors = require('cors'); 
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const client = new basex.Session("localhost", 1984, "admin", "admin");

app.use(express.json());

client.execute("open vets_2025", (err) => {
    if (err) {
        console.error("Failed to open BaseX database:", err);
        process.exit(1);
    } else {
        console.log("Successfully connected to BaseX database 'vets_2025'");
    }
});

app.get('/api/clinics', async (req, res) => {
    const query = `
        xquery
        
        let $clinics := /graph/ambulance
        return
          '[' ||
          string-join(
            for $clinic in $clinics
            return
              '{' ||
              '"id":"' || normalize-space($clinic/id) || '",' ||
              '"location":"' || normalize-space($clinic/hasLocation) || '",' ||
              '"date":"' || normalize-space($clinic/hasDate) || '",' ||
              '"name":"' || normalize-space($clinic/hasNameOfPlace) || '",' ||
              '"legalEntity":"' || normalize-space($clinic/hasLegalEntity) || '",' ||
              '"address":"' || normalize-space($clinic/hasAddress) || '",' ||
              '"longitude":' || $clinic/hasLongitude/number() || ',' ||
              '"latitude":' || $clinic/hasLatitude/number() || ',' ||
              '"type":"' || normalize-space($clinic/hasType) || '",' ||
              '"animalSpecializations":[' ||
                string-join(
                  for $a in $clinic/animalSpecializations/animal
                  return '"' || normalize-space($a) || '"'
                  , ','
                )
              || '],' ||
        
           
        
              '"collaborations":[' ||
                string-join(
                  for $c in $clinic/collaborations/collaboratesWith
                  return '"' || normalize-space($c) || '"'
                  , ','
                )
              || '],' ||
        
              '"services":[' ||
                string-join(
                  for $s in $clinic/services/service
                  return '"' || normalize-space($s) || '"'
                  , ','
                )
              || ']' ||
        
              '}'
            , ','
          )
          || ']'
          `;

    try {
        const result = await new Promise((resolve, reject) => {
            client.execute(query, (err, result) => {
                if (err) return reject(err);
                resolve(result.result);
            });
        });

        const clinics = result.split('},{')
            .map(clinicStr => {
                try {
                    
                    let jsonStr = clinicStr.trim();
                    if (!jsonStr.startsWith('{')) jsonStr = '{' + jsonStr;
                    if (!jsonStr.endsWith('}')) jsonStr = jsonStr + '}';

                    
                    const clinic = JSON.parse(jsonStr);
                    return {
                        id: clinic.id.trim(),
                        location: clinic.location.trim(),
                        date: clinic.date.trim(),
                        name: clinic.name.trim(),
                        legalEntity: clinic.legalEntity.trim(),
                        address: clinic.address.trim(),
                        longitude: parseFloat(clinic.longitude),
                        latitude: parseFloat(clinic.latitude),
                        type: clinic.type.trim(),
                        animalSpecializations: Array.isArray(clinic.animalSpecializations)
                            ? clinic.animalSpecializations.map(a => a.trim())
                            : [],
                        collaborations: Array.isArray(clinic.collaborations)
                            ? clinic.collaborations.map(c => c.trim())
                            : [],
                        services: Array.isArray(clinic.services)
                            ? clinic.services.map(s => s.trim())
                            : []
                    };
                } catch (e) {
                    console.error('Error parsing clinic:', clinicStr, e);
                    return null;
                }
            })
            .filter(clinic => clinic !== null);

        res.json(clinics);
    } catch (err) {
        console.error("Clinics Error:", err);
        res.status(500).json({
            error: "Failed to fetch clinics",
            details: err.message
        });
    }
});

app.get('/api/locations', async (req, res) => {
    const query = `
        xquery
        distinct-values(/graph/ambulance/hasLocation/normalize-space())
    `;

    try {
        const result = await new Promise((resolve, reject) => {
            client.execute(query, (err, result) => {
                if (err) return reject(err);
                resolve(result.result);
            });
        });

        const locations = result.split('\n')
            .map(loc => loc.trim())
            .filter(loc => loc.length > 0);

        res.json(locations);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch locations",
            details: err.message
        });
    }
});

app.get('/api/types', async (req, res) => {
    const query = `
        xquery
        distinct-values(/graph/ambulance/hasType/normalize-space())
    `;

    try {
        const result = await new Promise((resolve, reject) => {
            client.execute(query, (err, result) => {
                if (err) return reject(err);
                resolve(result.result);
            });
        });

        const types = result.split('\n')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        res.json(types);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch types",
            details: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

process.on('SIGINT', () => {
    client.execute("exit", (err) => {
        if (err) console.error("Error closing connection:", err);
        process.exit();
    });
});
app.post('/api/xquery', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: "No XQuery provided" });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            client.execute(`xquery ${query}`, (err, result) => {
                if (err) return reject(err);
                resolve(result.result);
            });
        });

        res.set('Content-Type', 'application/xml');
        res.send(result);
    } catch (err) {
        console.error("XQuery execution error:", err);
        res.status(500).json({
            error: "XQuery execution failed",
            details: err.message
        });
    }
});
app.use(express.static('public'));
const path = require('path');

app.get('/', (req, res) => {
    res.sendFile('C:/Users/ninam/OneDrive/Desktop/Timski_2025/public/xquery.html');
});

