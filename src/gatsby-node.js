const axios = require("axios");

exports.sourceNodes = async (
  { actions, createNodeId, createContentDigest },
  { placeId, apiKey, langs = [], isEnabled }
) => {
  const { createNode } = actions;

  if (!isEnabled) {
    return;
  }

  if (!apiKey || typeof apiKey !== "string") {
    throw new Error(
      "You must supply a valid API Key from Scale Serp. Visit https://scaleserp.com/ for more information."
    );
  }

  if (!placeId || typeof placeId !== "string") {
    throw new Error(
      "You must supply a valid place id from Google. You can find your place id at https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder."
    );
  }

  const params = {
    api_key: apiKey,
    search_type: "place_reviews",
    place_id: placeId,
  };

  const promises = langs.length
    ? langs.map((lang) =>
        axios.get("https://api.scaleserp.com/search", {
          params: { ...params, hl: lang },
        })
      )
    : [axios.get("https://api.scaleserp.com/search", { params })];

  const responses = await Promise.all(promises).catch((error) => {
    throw new Error(`Error fetching results from ScaleSerp API: ${error}`);
  });

  for (let i = 0; i < langs.length; i++) {
    const response = responses[i];
    const lang = langs[i];

    const reviews = response.data.place_reviews_results;

    reviews.forEach((review) => {
      const reviewWithLang = { ...review, lang };
      const nodeContent = JSON.stringify(reviewWithLang);
      const nodeMeta = {
        id: createNodeId(`google-review-${lang}-${review.source}`),
        parent: null,
        children: [],
        internal: {
          type: `GoogleReview`,
          content: nodeContent,
          contentDigest: createContentDigest(reviewWithLang),
        },
      };
      const node = Object.assign({}, reviewWithLang, nodeMeta);
      createNode(node);
    });
  }
};

exports.createSchemaCustomization = ({ actions }, { isEnabled }) => {
  if (isEnabled) {
    return;
  }

  const { createTypes } = actions;
  const typeDefs = `
    type GoogleReview implements Node @dontInfer {
      rating: Int
      position: Int
      body: String
      source: String
      lang: String
    }
  `;

  createTypes(typeDefs);
};
