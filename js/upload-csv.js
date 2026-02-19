function mapDataTo(dataArray, key) {
    const groupedData = {};

    try {
        dataArray.forEach((data, index) => {
            try {
                // Skip empty rows
                if (!data || Object.keys(data).every(k => !data[k])) {
                    return;
                }

                if (key in data) {
                    const name = data[key];
                    if (name) { // Only add if key has a value
                        // If the name doesn't exist in the groupedData, create an array
                        if (!groupedData[name]) {
                            groupedData[name] = [];
                        }
                        // Push the current data into the array under the name key
                        groupedData[name].push(data);
                    }
                } else {
                    console.warn(`Row ${index + 1}: Expected '${key}' property not found. Available columns: ${Object.keys(data).join(', ')}`);
                }
            } catch (rowError) {
                console.error(`Error processing row ${index}:`, rowError);
            }
        });
    } catch (e) {
        console.error("Error in mapDataTo:", e);
        throw e;
    }

    return groupedData;
}

function parseCSV(fileContent) {
    return new Promise((resolve, reject) => {
        try {
            Papa.parse(fileContent, {
                header: true,
                complete: function (result) {
                    try {
                        if (result.errors && result.errors.length > 0) {
                            console.warn("CSV parsing warnings:", result.errors);
                        }
                        resolve(result.data);
                    } catch (e) {
                        console.error("Error in Papa.parse complete callback:", e);
                        reject(e);
                    }
                },
                error: function (error) {
                    console.error("Papa Parse error callback:", error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error("Error calling Papa.parse:", error);
            reject(error);
        }
    });
}

async function parseCsvAndSave(file, fileContent) {
    try {
        // Validate file object
        if (!file || !file.name) {
            throw new Error("File object is invalid - missing name property");
        }

        // parse csv
        const parsedData = await parseCSV(fileContent);

        // map csv to dict
        const collection = mapDataTo(parsedData, 'Scryfall ID');

        // Get the file modification timestamp
        const fileModifiedTime = file.lastModified || Date.now();

        // save collection dict to local storage
        await browser.storage.local.set({ 
            collection: collection, 
            filename: file.name,
            fileModifiedTime: fileModifiedTime
        });
        location.reload();
    } catch (error) {
        console.error('Error in parseCsvAndSave:', error);
        alert(`Error processing CSV: ${error.message}`);
    }
}

(function main() {
    console.log("upload-csv.js");
    // Function to initialize the file upload UI
    function initializeUI() {
        // Try to find the nav element
        let navElement = document.querySelector('nav[aria-label="breadcrumb"]');

        const div = document.createElement("div");

        var filenameDiv = document.createElement('div');
        filenameDiv.id = "manabox-file-name";
        div.appendChild(filenameDiv);

        var fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".csv";
        div.appendChild(fileInput);

        // If nav element exists, insert after it; otherwise insert at the beginning of body
        if (navElement) {
            navElement.insertAdjacentElement("afterend", div);
        } else {
            // Fallback: insert at the top of the body
            document.body.insertBefore(div, document.body.firstChild);
            console.warn("Nav element not found, inserted file input at top of page");
        }

        // Retrieve data from local storage (do this after UI is created)
        if (browser && browser.storage) {
            browser.storage.local.get(['filename', 'fileModifiedTime'])
                .then((result) => {
                    try {
                        const filename = result.filename;
                        const fileModifiedTime = result.fileModifiedTime;
                        if (filename) {
                            let displayText = filename;
                            if (fileModifiedTime) {
                                const modifiedDate = new Date(fileModifiedTime);
                                displayText += ` (Modified: ${modifiedDate.toLocaleString()})`;
                            }
                            filenameDiv.textContent = displayText;
                        }
                    } catch (err) {
                        console.error('Error setting filename text:', err);
                    }
                })
                .catch((error) => {
                    console.error('Error retrieving filename:', error);
                });
        }

        // Add event listener for file selection
        fileInput.addEventListener('change', readFileContent);

        // Function to handle file selection
        function readFileContent(event) {
            // Check if any file is selected
            if (fileInput.files.length > 0) {
                // Attach error handlers only during file processing
                const handleError = function (event) {
                    console.error('Error during CSV processing:', event.error);
                    event.preventDefault();
                };

                const handleUnhandledRejection = function (event) {
                    console.error('Unhandled promise rejection during CSV processing:', event.reason);
                    event.preventDefault();
                };

                window.addEventListener('error', handleError);
                window.addEventListener('unhandledrejection', handleUnhandledRejection);

                // Get the selected file
                var file = fileInput.files[0];

                // Create a new FileReader
                var reader = new FileReader();

                // Define the onload event handler
                reader.onload = function (e) {
                    try {
                        // e.target.result contains the file content as a data URL
                        var fileContent = e.target.result;

                        parseCsvAndSave(file, fileContent).catch(err => {
                            console.error("Unhandled error from parseCsvAndSave:", err);
                        }).finally(() => {
                            // Clean up error handlers after processing
                            window.removeEventListener('error', handleError);
                            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
                        });
                    } catch (err) {
                        console.error("Error in reader.onload:", err);
                        window.removeEventListener('error', handleError);
                        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
                    }
                }

                reader.onerror = function (error) {
                    console.error("FileReader error:", error);
                    alert(`Error reading file: ${error.message || error}`);
                    // Clean up error handlers
                    window.removeEventListener('error', handleError);
                    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
                }

                // Read the file as text
                reader.readAsText(file);
            }
        }
    }

    // Initialize after browser becomes idle
    function deferUntilIdle() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initializeUI, { timeout: 2000 });
        } else {
            setTimeout(initializeUI, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', deferUntilIdle);
    } else {
        deferUntilIdle();
    }
})();
