const {test,expect}=require('@playwright/test');
const {local,protect,signup,onboard}=require('./helpers.cjs');
test('configured Adzuna can be searched; unavailable job sources stay disabled',async({page,context,baseURL})=>{
 test.skip(!local,'Synthetic connector results are local fixtures only');
 await protect(context,baseURL);
 await page.addInitScript(()=>{
  window.__E2E_SOURCE_READINESS__={adzuna:true,greenhouse:false,lever:false};
  window.__E2E_ADZUNA_RESULTS__=[{title:'Data Analyst',company:'Synthetic Connector Company',location:'Lagos, Nigeria',description:'Analyse data using SQL and Python.',url:'https://jobs.example/fixture-1',salary_currency:'NGN'}];
 });
 await signup(page,baseURL);await onboard(page);
 await page.locator('nav[aria-label=Primary] [data-view=search]').click();
 await page.getByText('More filters and sources',{exact:true}).click();
 await expect(page.locator('#provider option[value=adzuna]')).toBeEnabled();
 await expect(page.locator('#provider option[value=greenhouse]')).toBeDisabled();
 await expect(page.locator('#provider option[value=lever]')).toBeDisabled();
 await page.locator('#provider').selectOption('adzuna');
 await page.locator('#q').fill('Data Analyst');await page.locator('#loc').fill('Lagos, Nigeria');
 await page.locator('#searchBtn').click();
 await expect(page.locator('#jobList')).toContainText('Synthetic Connector Company');
 await expect(page.locator('#searchStatus')).toContainText('adzuna');
});
