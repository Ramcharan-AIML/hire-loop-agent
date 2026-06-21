import { Font } from "@react-pdf/renderer";

// Register Roboto font family with stable TrueType font URLs from CDNjs
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9BPmsADU.ttf",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmSU5fBBc9BPmsADU.ttf",
      fontWeight: 300,
    },
  ],
});

export { Font };
