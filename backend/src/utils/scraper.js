import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePrices(searchTerm) {
  const results = [];
  const searchUrl = `https://www.emag.ro/search/${encodeURIComponent(
    searchTerm
  )}`;

  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    const PRODUCT_CARD_SELECTOR = ".card-item";

    $(PRODUCT_CARD_SELECTOR)
      .slice(0, 15)
      .each((index, element) => {
        const title = $(element).attr("data-name");
        const link = $(element).attr("data-url");

        const priceText = $(element).find(".product-new-price").text().trim();

        const cleanedPriceText = priceText
          .replace("Lei", "")
          .replace(/\./g, "")
          .replace(/\,/g, ".")
          .trim();

        const price = parseFloat(cleanedPriceText);

        if (
          title &&
          price &&
          link &&
          !isNaN(price) &&
          link.startsWith("http")
        ) {
          results.push({
            source: "eMAG",
            title: title,
            price: price,
            link: link,
          });
        }
      });
  } catch (error) {
    console.error(`Scraping error for ${searchTerm}:`, error.message);
  }

  return results;
}
