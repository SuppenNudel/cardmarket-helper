const apiKey = "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";
const formatsDbId = "17af020626c280ac8a46c3de06fc9305";

async function fetchNotionDb(db_id) {
    const url = `https://api.notion.com/v1/databases/${db_id}/query`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("Error Details:", errorDetails);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const resultMap = {};

        data.results.forEach(page => {
            const name = page.properties["Name"].title[0].plain_text;
            const mention = page.properties["Page"].rich_text[0].mention
            const formatPageId = mention[mention['type']].id;
            const mtgtop8key = page.properties["mtgtop8_key"].rich_text[0].plain_text;
            const scryfallkey = page.properties["scryfall_key"].rich_text[0].plain_text;
            resultMap[name] = {formatPageId: formatPageId, mtgtop8key: mtgtop8key, scryfallkey: scryfallkey };
        })

        return resultMap;
    } catch (error) {
        console.error("Failed to fetch Notion data:", error);
    }
}

async function fetchFilteredNotionData(db_id, card_names) {
    const url = `https://api.notion.com/v1/databases/${db_id}/query`;

    // Create an "or" filter to match any of the provided card names
    const filter = {
        or: card_names.map(name => ({
            property: "card name", // Replace with your property name
            rich_text: {
                equals: name
            }
        }))
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ filter })
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("Error Details:", errorDetails);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        // Create a map where "card name" is the key
        const resultMap = {};

        data.results.forEach(page => {
            const cardName = page.properties["card name"].title[0]?.plain_text || "No Card Name";
            const occMain = page.properties["occ main"].number || 0;
            const occSide = page.properties["occ side"].number || 0;

            // Use "card name" as the key and store the other properties as value
            resultMap[cardName] = { occ_main: occMain, occ_side: occSide };
        });

        return resultMap;
    } catch (error) {
        console.error("Failed to fetch Notion data:", error);
    }
}

function parseDecksCount(text) {
    const match = text.match(/(\d+)\s+decks/);  // Match one or more digits followed by " decks"
    return match ? parseInt(match[1], 10) : null; // Return the parsed number or null if no match
}

async function fetchDatabaseDescription(database_id) {
    const url = `https://api.notion.com/v1/databases/${database_id}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Notion-Version": "2022-06-28", // Adjust the Notion API version if necessary
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("Error Details:", errorDetails);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        // Assuming the description is stored in the "description" property (if available)
        // Description might be part of the database's properties or metadata
        const description = data.description || "No description available";

        return description[0]["plain_text"];
    } catch (error) {
        console.error("Failed to fetch database description:", error);
        return "No description available";
    }
}



// (async function main() {
//     console.log("notion.js");
//     result = await fetchFilteredNotionData(["Mountain", "Plains", "Abzan Skycaptain"]);
//     console.log(result);
//     console.log(result.get("Mountain"))
//     console.log(result.get("Plains"))
//     console.log(result.get("Abzan Skycaptain"))
// })();