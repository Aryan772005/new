const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const insertIdx = html.indexOf('<section id="faq"');

const block = `
    <!-- ================= GLIMPSES OF LAST YEAR ================= -->
    <section id="glimpses" aria-label="Past Hackathon Glimpses" class="reveal-3d-section">
      <style>
        #glimpses {
          position: relative;
          background: #080004;
          padding: 100px 20px;
          overflow: hidden;
          z-index: 5;
        }
        #glimpses::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 60% at 50% 50%, rgba(180,0,0,0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        #glimpses::after {
          content: '';
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #cc0000, #ff2020, #cc0000, transparent);
          box-shadow: 0 0 12px 2px rgba(204,0,0,0.6);
        }
        .glimpses-inner {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }
        .glimpses-header {
          text-align: center;
        }
        .glimpses-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(2rem, 3.5vw, 3.2rem);
          font-weight: 800;
          color: #f5f5f5;
          margin-bottom: 15px;
          line-height: 1.1;
        }
        .glimpses-title-red {
          background: linear-gradient(100deg, #ff2020 0%, #ff6060 40%, #ffaaaa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 14px rgba(255,32,32,0.45));
        }
        .glimpses-subtitle {
          font-family: 'Inter', sans-serif;
          color: #8a8a9a;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }
        .glimpses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          width: 100%;
        }
        .glimpse-card {
          position: relative;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(180,0,0,0.3);
          background: #110000;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .glimpse-card:hover {
          transform: translateY(-5px);
          border-color: #ff2020;
          box-shadow: 0 10px 30px rgba(255,32,32,0.15);
        }
        .glimpse-card img {
          width: 100%;
          height: auto;
          display: block;
          aspect-ratio: 3/2;
          object-fit: cover;
          opacity: 0.85;
          transition: opacity 0.3s ease, transform 0.5s ease;
        }
        .glimpse-card:hover img {
          opacity: 1;
          transform: scale(1.05);
        }
        .glimpse-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(15,0,0,0.9) 0%, transparent 60%);
          pointer-events: none;
        }
        .glimpse-bottom-line {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #cc0000, #ff2020, #cc0000, transparent);
          box-shadow: 0 0 12px 2px rgba(204,0,0,0.6);
        }
      </style>

      <div class="glimpses-inner">
        <div class="glimpses-header">
          <div class="robot-eyebrow-badge" style="margin-bottom:15px; margin-left:auto; margin-right:auto;">
            <div class="robot-badge-dot"></div>
            PREVIOUS TRANSMISSION
          </div>
          <h2 class="glimpses-title">
            VISION TECH FEST <br><span class="glimpses-title-red">ARCHIVES</span>
          </h2>
          <p class="glimpses-subtitle">
            A glimpse into the chaos and creativity of our previous hackathons. Builders pushed their limits, and the results were legendary.
          </p>
        </div>

        <div class="glimpses-grid">
          <div class="glimpse-card">
            <img src="assets/images/glimpse1.jpeg" alt="Glimpse 1" loading="lazy">
            <div class="glimpse-card-overlay"></div>
          </div>
          <div class="glimpse-card">
            <img src="assets/images/glimpse2.jpeg" alt="Glimpse 2" loading="lazy">
            <div class="glimpse-card-overlay"></div>
          </div>
          <div class="glimpse-card">
            <img src="assets/images/glimpse3.jpeg" alt="Glimpse 3" loading="lazy">
            <div class="glimpse-card-overlay"></div>
          </div>
        </div>
      </div>
      <div class="glimpse-bottom-line"></div>
    </section>
    <!-- ================= END GLIMPSES ================= -->

`;

if (insertIdx !== -1) {
  html = html.substring(0, insertIdx) + block + html.substring(insertIdx);
  fs.writeFileSync('index.html', html);
  console.log('Successfully injected glimpses section!');
} else {
  console.log('Failed to find FAQ section.');
}
