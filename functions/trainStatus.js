import * as cheerio from "cheerio";

const getTrainStatus = async (trainNo, date) => {
  try {
    if (!trainNo || !date) {
      throw "Inavild arguement provided";
    }

    const response = await fetch(
      `https://runningstatus.in/status/${trainNo}-on-${date}`
    );
    const data = await response.text();

    const $ = cheerio.load(data);
    const statusCard = $(".card-header");
    const trainContent = statusCard.text().split("\n")[2].split("|")[0];
    const trainName = statusCard.find("h1").text();

    return { trainContent, trainName };
  } catch (error) {
    return { error: error };
  }
};

export { getTrainStatus };

getTrainStatus(18451, 20231028);
