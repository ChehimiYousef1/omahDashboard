import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  BreakdownBarList,
  Panel,
} from "./AnalyticsShared";


export function SegmentationAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const segmentation =
    analytics.segmentation;


  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Position Tracks"
          subtitle="Applicant distribution by requested recruitment track."
        >
          <BreakdownBarList
            data={
              segmentation
                .positions
                .tracks
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Position Types"
        >
          <BreakdownBarList
            data={
              segmentation
                .positions
                .types
            }
          />
        </Panel>
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Countries"
        >
          <BreakdownBarList
            data={
              segmentation
                .geography
                .countries
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Cities"
        >
          <BreakdownBarList
            data={
              segmentation
                .geography
                .cities
            }
            limit={
              15
            }
          />
        </Panel>
      </div>


      <div className="grid gap-5 xl:grid-cols-4">
        <Panel
          title="Degree Levels"
        >
          <BreakdownBarList
            data={
              segmentation
                .education
                .degreeLevels
            }
          />
        </Panel>

        <Panel
          title="Universities"
        >
          <BreakdownBarList
            data={
              segmentation
                .education
                .universities
            }
          />
        </Panel>

        <Panel
          title="Majors"
        >
          <BreakdownBarList
            data={
              segmentation
                .education
                .majors
            }
          />
        </Panel>

        <Panel
          title="Study Status"
        >
          <BreakdownBarList
            data={
              segmentation
                .education
                .studyStatuses
            }
          />
        </Panel>
      </div>


      <Panel
        title="Technical Experience Level"
      >
        <BreakdownBarList
          data={
            segmentation
              .experience
              .technicalLevels
          }
        />
      </Panel>


      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Primary Technical Skills"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .primaryTechnical
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Programming Languages"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .programmingLanguages
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Frameworks"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .frameworks
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Databases"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .databases
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Cloud / DevOps"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .cloudDevOps
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Soft Skills"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .softSkills
            }
            limit={
              15
            }
          />
        </Panel>
      </div>


      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Data Analyst Skills"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .dataAnalytics
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="Data Engineering Skills"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .dataEngineering
            }
            limit={
              15
            }
          />
        </Panel>

        <Panel
          title="AI / ML Skills"
        >
          <BreakdownBarList
            data={
              segmentation
                .skills
                .aiMl
            }
            limit={
              15
            }
          />
        </Panel>
      </div>
    </div>
  );
}
