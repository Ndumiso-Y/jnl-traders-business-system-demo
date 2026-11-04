import { Notice, PageHeader, Panel } from '../components/ui';

/** Honest placeholder for modules not yet implemented. Shown instead of dead buttons. */
export default function Placeholder({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <>
      <PageHeader kicker={kicker} title={title} subtitle={subtitle} />
      <Panel>
        <Notice tone="amber">
          <b>Planned — not yet functional.</b> This module is scheduled in the build sequence and will appear here once implemented and verified in the browser.
        </Notice>
      </Panel>
    </>
  );
}
