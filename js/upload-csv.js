function mapDataTo(dataArray, key) {
    console.log("upload-csv.js - mapDataToName(dataArray)");
    const groupedData = {};

    dataArray.forEach(data => {
        if (key in data) {
            const name = data[key];

            // If the name doesn't exist in the groupedData, create an array
            if (!groupedData[name]) {
                groupedData[name] = [];
            }

            // Push the current data into the array under the name key
            groupedData[name].push(data);
        } else {
            console.error(`Invalid data format. Expected '${key}' property.`);
        }
    });

    return groupedData;
}

function parseCSV(fileContent) {
    console.log("upload-csv.js - parseCSV(fileContent)");
    return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
            header: true,
            complete: function (result) {
                console.log("csv parsing finished");
                resolve(result.data);
            },
            error: function (error) {
                reject(error);
            }
        });
    });
}

async function parseCsvAndSave(file, fileContent) {
    console.log("upload-csv.js - parseCsvAndSave(file, fileContent)");
    // parse csv
    const parsedData = await parseCSV(fileContent);
    console.log(parsedData);

    // map csv to dict
    const collection = mapDataTo(parsedData, 'Scryfall ID');
    console.log(collection);

    // save collection dict to local storage
    browser.storage.local.set({ collection: collection, filename: file.name })
    .then(() => {
        console.log('Data saved successfully');
        location.reload();
    })
    .catch((error) => {
        console.error('Error saving data:', error);
    });
}

(async function main() {
    console.log("upload-csv.js");

    const div = document.createElement("div");
    
    var filenameDiv = document.createElement('div');
    filenameDiv.id = "manabox-file-name";
    div.appendChild(filenameDiv);
    
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";
    div.appendChild(fileInput);

    const navElement = document.querySelector('nav[aria-label="breadcrumb"]')
    navElement.insertAdjacentElement("afterend", div);

    // Retrieve data from local storage
    browser.storage.local.get('filename')
        .then((result) => {
            const filename = result.filename;
            filenameDiv.textContent = filename;
        })
        .catch((error) => {
            console.error('Error retrieving filename:', error);
        });

    // Add event listener for file selection
    fileInput.addEventListener('change', readFileContent);

    // Function to handle file selection
    function readFileContent(event) {
        // Check if any file is selected
        if (fileInput.files.length > 0) {
            // Get the selected file
            var file = fileInput.files[0];

            // Create a new FileReader
            var reader = new FileReader();

            // Define the onload event handler
            reader.onload = function (e) {
                alert("Don't worry. The '<filename>: undefined' alert is unwanted and I am aware of it.\nHowerver it does not distrub any functionality.\nGoing to read your csv and then reloading page automatically.");
                // e.target.result contains the file content as a data URL
                var fileContent = e.target.result;

                // Display the file content (for demonstration purposes)
                console.log('File Content:', fileContent);

                parseCsvAndSave(file, fileContent);
            }

            // // Read the file as text
            reader.readAsText(file);
        } else {
            console.log('No file selected.');
        }
    }
})();
