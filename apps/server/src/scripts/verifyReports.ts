import { PrismaClient } from '@prisma/client';
import { getReportData } from '../services/reporting/queryBuilder';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Report Data Generation...');

  const reports = await prisma.reportTemplate.findMany();
  console.log(`Found ${reports.length} reports.`);

  for (const report of reports) {
    console.log(`\n---------------------------------------------------`);
    console.log(`Testing Report: ${report.name} (${report.type})`);
    try {
      const results = await getReportData(report.id);

      const mainResult = results.get('main');
      if (mainResult?.error) {
        console.error(`❌ Error logic: ${mainResult.error}`);
      } else if (mainResult?.success) {
        const data = mainResult.data;
        // Check for data array
        const itemCount = data.data
          ? data.data.length
          : data.rows
          ? data.rows.length
          : data.features
          ? data.features.length
          : 'N/A';
        console.log(`✅ Success! Returns ${itemCount} items.`);

        // Log snippet
        if (Array.isArray(data.data) && data.data.length > 0) console.log('Snippet:', data.data[0]);
        if (Array.isArray(data.rows) && data.rows.length > 0) console.log('Snippet:', data.rows[0]);
        if (Array.isArray(data.features) && data.features.length > 0)
          console.log('Snippet:', data.features[0]);
      } else {
        console.log(`⚠️  Unknown result format:`, results);
      }
    } catch (e: any) {
      console.error(`❌ FAILED: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
