
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');


//------------------------------lê os xmls upados na pasta xml_files e retorna um json com os dados do curriculo----------------------

const getLattes = async (req, res) => {
    
    const parser = new xml2js.Parser();
    const dir = path.join(__dirname, '../../xml_files');
    const files = fs.readdirSync(dir);
    const lattes = [];

    files.forEach(file => {
        const xml = fs.readFileSync(path.join(dir, file));
        parser.parseString(xml, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                lattes.push(result);
            }
        });
    });

    res.json(lattes);
}


module.exports = {
    getLattes
}
