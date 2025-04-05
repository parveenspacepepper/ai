const issuerUrl = process.env.ISSUER_URL;
export default {
  providers: [
    {
      domain: issuerUrl,
      applicationID: "convex",
    },
  ],
};
