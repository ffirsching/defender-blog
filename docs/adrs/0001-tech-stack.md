# Tech Stack Selection

## Status

Accepted

## Context

This project is both a fun hobby project and a portfolio showcase, as well as providing opportunity to experiment with different technologies. As such, it started with the question of which tech stack to use. The tech stack should be easy to work with, leverage the most common libraries and frameworks in the industry, and be performant. It had to be flexible enough to allow trying out different technologies while being established enough to be relevant and adequate for the job.

## Decision

The blog will be built on Astro for the frontend. Different sections and functionalities will be implemented using React, Angular, and Vue, allowing for experimentation with various front-end frameworks. Static site generation (SSG) and server-side rendering (SSR) will be employed where appropriate — for example, blog posts will use SSG since they require minimal interaction.

For content management, a headless CMS such as Contentful is the preferred choice, assuming a suitable free plan is available. If not, alternatives like Sanity or Strapi will be considered. Styling will be handled with Tailwind CSS, given its widespread industry adoption and utility.

For hosting, the best option is still open. Possible choices include Vercel or Netlify for simplicity, or cloud providers (AWS, GCP, Azure) configured via Terraform to gain DevOps experience and ensure multi-cloud flexibility.

## Consequences

### Benefits:

Astro allows for integrating multiple frameworks, making it an ideal portfolio piece to showcase expertise in different technologies.

Its SSR and island architecture ensure high performance while maintaining flexibility.

Using a headless CMS decouples content from the codebase, improving maintainability and scalability.

Tailwind simplifies styling and aligns with modern industry practices.

Deploying via Terraform provides hands-on infrastructure-as-code experience.

### Challenges:

- Potential Overhead: Astro might be overkill for a simple blog, and using multiple frameworks increases complexity.

- Performance Considerations: While Astro optimizes partial hydration, mixing React, Angular, and Vue could introduce unnecessary client-side overhead.

- Headless CMS Availability: If Contentful’s free tier doesn’t meet requirements, switching to another CMS might introduce migration overhead.

- Hosting Considerations: Using Terraform for multiple cloud providers adds complexity—if simplicity is preferred, managed hosting solutions like Vercel or Netlify might be better.

- Testing & Maintenance: Managing multiple frameworks requires a clear testing strategy and ongoing maintenance effort.

## Open Questions

How will multiple frameworks impact long-term maintainability?

Will there be a fallback hosting strategy if Terraform setup proves too complex?

How will content updates be handled—static builds at deploy time or dynamic fetching?

Should a single, more unified framework be considered if the project grows?

These decisions will evolve as the project progresses, but this ADR sets the foundation for the initial approach.