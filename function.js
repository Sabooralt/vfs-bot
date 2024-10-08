const url = "https://www.vfsglobal.com/en/individuals/index.html";

let userEmail = "";
let userPassword = "";

async function applyForVisa(email, password) {
    const browser = await puppeteer.launch({ headless: true }); // Open the browser in visible mode
    const page = await browser.newPage();
  
    await page.goto("https://www.vfsglobal.com/en/individuals/index.html", {
      waitUntil: "networkidle2",
    });
  
    await page.type("#mat-input-0", email, { delay: 100 }); // Input email with delay
    await page.type("#mat-input-1", password, { delay: 100 }); // Input password with delay
  
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
  
    await browser.close();
  }
  
  async function getCountries() {
    try {
      puppeteer.use(StealthPlugin());
  
      const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();
  
      await page.goto("https://www.vfsglobal.com/en/individuals/index.html", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
  
      const countryOptions = await page.$$eval("li[data-index]", (elements) =>
        elements.map((el) => el.innerText.trim())
      );
  
      console.log("Countries found:", countryOptions);
  
      await browser.close();
      return countryOptions;
    } catch (err) {
      console.log(err);
    }
  }
  
  const botFunction = async () => {
    /*   const email = await input({ message: "Enter your email:" });
    const userPassword = await password({ message: "Enter your password:" }); */
  
    // Launch Puppeteer
    const browser = await puppeteer.launch({ headless: false }); // Change to true if you don't want to see the browser
    const page = await browser.newPage();
  
    // Navigate to the login page
    await page.goto("https://visa.vfsglobal.com/are/en/prt/login");
  
    // Wait for the email and password fields to load
    await page.waitForSelector("input#email"); // Adjust this selector if necessary
    await page.waitForSelector("input#password"); // Adjust this selector if necessary
  
    // Fill the email field
    await page.type("input#email", "abdulsaboormillwala123@gmail.com", {
      delay: 100,
    });
  
    await page.type("input#password", "consolidation@340", { delay: 200 });
  
    /*  if ((await page.$("input[type='checkbox']")) !== null) {
      await page.click("input[type='checkbox']");
    } */
  
    await page.click("button[mat-stroked-button]");
  
    await page.waitForNavigation();
  
    console.log("Login form submitted successfully");
  };
  