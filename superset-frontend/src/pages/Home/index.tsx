/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  isFeatureEnabled,
  FeatureFlag,
  getExtensionsRegistry,
  JsonObject,
  styled,
  t,
} from '@superset-ui/core';
import rison from 'rison';
import { ListViewCard } from '@superset-ui/core/components';
import { User } from 'src/types/bootstrapTypes';
import { reject } from 'lodash';
import {
  dangerouslyGetItemDoNotUse,
  dangerouslySetItemDoNotUse,
  getItem,
  LocalStorageKeys,
} from 'src/utils/localStorageHelpers';
import withToasts from 'src/components/MessageToasts/withToasts';
import {
  CardContainer,
  createErrorHandler,
  getRecentActivityObjs,
  getUserOwnedObjects,
  loadingCardCount,
  mq,
  HomeLayout,
  OverviewSection,
  StatCard,
  SectionHeader,
  ViewToggle,
} from 'src/views/CRUD/utils';
import { Switch } from '@superset-ui/core/components/Switch';
import getBootstrapData from 'src/utils/getBootstrapData';
import { TableTab } from 'src/views/CRUD/types';
import SubMenu, { SubMenuProps } from 'src/features/home/SubMenu';
import { userHasPermission } from 'src/dashboard/util/permissionUtils';
import { WelcomePageLastTab } from 'src/features/home/types';
import ActivityTable from 'src/features/home/ActivityTable';
import ChartTable from 'src/features/home/ChartTable';
import SavedQueries from 'src/features/home/SavedQueries';
import DashboardTable from 'src/features/home/DashboardTable';

const extensionsRegistry = getExtensionsRegistry();

interface WelcomeProps {
  user: User;
  addDangerToast: (arg0: string) => void;
}

export interface ActivityData {
  [TableTab.Created]?: JsonObject[];
  [TableTab.Edited]?: JsonObject[];
  [TableTab.Viewed]?: JsonObject[];
  [TableTab.Other]?: JsonObject[];
}

interface LoadingProps {
  cover?: boolean;
}

// Note: DEFAULT_TAB_ARR removed as we're using a new layout structure without collapse

const WelcomeContainer = styled.div`
  background: ${({ theme }) => theme.colorBgLayout};
  .ant-row.menu {
    margin-top: -15px;

    &:after {
      content: '';
      display: block;
      margin: 0px ${({ theme }) => theme.sizeUnit * 6}px;
      position: relative;
      width: 100%;

      ${mq[1]} {
        margin-top: 5px;
        margin: 0px 2px;
      }
    }

    button {
      padding: 3px 21px;
    }
  }

  .ant-card-meta-description {
    margin-top: ${({ theme }) => theme.sizeUnit}px;
  }

  .ant-card.ant-card-bordered {
    border: 1px solid ${({ theme }) => theme.colorBorder};
  }

  .loading-cards {
    margin-top: ${({ theme }) => theme.sizeUnit * 8}px;

    .ant-card-cover > div {
      height: 168px;
    }
  }
`;

const WelcomeNav = styled.div`
  ${({ theme }) => `
    .switch {
      display: flex;
      flex-direction: row;
      margin: ${theme.sizeUnit * 4}px;
      span {
        display: block;
        margin: ${theme.sizeUnit}px;
        line-height: ${theme.sizeUnit * 3.5}px;
      }
    }
  `}
`;

const bootstrapData = getBootstrapData();

export const LoadingCards = ({ cover }: LoadingProps) => (
  <CardContainer showThumbnails={cover} className="loading-cards">
    {[...new Array(loadingCardCount)].map((_, index) => (
      <ListViewCard
        key={index}
        cover={cover ? false : <></>}
        description=""
        loading
      />
    ))}
  </CardContainer>
);

function Welcome({ user, addDangerToast }: WelcomeProps) {
  const canReadSavedQueries = userHasPermission(user, 'SavedQuery', 'can_read');
  const userid = user.userId;
  const id = userid!.toString(); // confident that user is not a guest user
  const params = rison.encode({ page_size: 24, distinct: false });
  const recent = `/api/v1/log/recent_activity/?q=${params}`;
  const [activeChild, setActiveChild] = useState('Loading');
  const userKey = dangerouslyGetItemDoNotUse(id, null);
  let defaultChecked = false;
  const isThumbnailsEnabled = isFeatureEnabled(FeatureFlag.Thumbnails);
  if (isThumbnailsEnabled) {
    defaultChecked =
      userKey?.thumbnails === undefined ? true : userKey?.thumbnails;
  }
  const [checked, setChecked] = useState(defaultChecked);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [chartData, setChartData] = useState<Array<object> | null>(null);
  const [queryData, setQueryData] = useState<Array<object> | null>(null);
  const [dashboardData, setDashboardData] = useState<Array<object> | null>(
    null,
  );
  const [isFetchingActivityData, setIsFetchingActivityData] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');

  // Note: Removed collapse state management as we're using a new layout structure

  const SubmenuExtension = extensionsRegistry.get('home.submenu');
  const WelcomeMessageExtension = extensionsRegistry.get('welcome.message');
  const WelcomeTopExtension = extensionsRegistry.get('welcome.banner');
  const WelcomeMainExtension = extensionsRegistry.get(
    'welcome.main.replacement',
  );

  const [otherTabTitle, otherTabFilters] = useMemo(() => {
    const lastTab = bootstrapData.common?.conf
      .WELCOME_PAGE_LAST_TAB as WelcomePageLastTab;
    const [customTitle, customFilter] = Array.isArray(lastTab)
      ? lastTab
      : [undefined, undefined];
    if (customTitle && customFilter) {
      return [t(customTitle), customFilter];
    }
    if (lastTab === 'all') {
      return [t('All'), []];
    }
    return [
      t('Examples'),
      [
        {
          col: 'created_by',
          opr: 'rel_o_m',
          value: 0,
        },
      ],
    ];
  }, []);

  useEffect(() => {
    if (!otherTabFilters || WelcomeMainExtension) {
      return;
    }
    const activeTab = getItem(LocalStorageKeys.HomepageActivityFilter, null);
    getRecentActivityObjs(user.userId!, recent, addDangerToast, otherTabFilters)
      .then(res => {
        const data: ActivityData | null = {};
        data[TableTab.Other] = res.other;
        if (res.viewed) {
          const filtered = reject(res.viewed, ['item_url', null]).map(r => r);
          data[TableTab.Viewed] = filtered;
          if (!activeTab && data[TableTab.Viewed]) {
            setActiveChild(TableTab.Viewed);
          } else if (!activeTab && !data[TableTab.Viewed]) {
            setActiveChild(TableTab.Created);
          } else setActiveChild(activeTab || TableTab.Created);
        } else if (!activeTab) setActiveChild(TableTab.Created);
        else setActiveChild(activeTab);
        setActivityData(activityData => ({ ...activityData, ...data }));
      })
      .catch(
        createErrorHandler((errMsg: unknown) => {
          setActivityData(activityData => ({
            ...activityData,
            [TableTab.Viewed]: [],
          }));
          addDangerToast(
            t('There was an issue fetching your recent activity: %s', errMsg),
          );
        }),
      );

    // Sets other activity data in parallel with recents api call
    const ownSavedQueryFilters = [
      {
        col: 'created_by',
        opr: 'rel_o_m',
        value: `${id}`,
      },
    ];
    Promise.all([
      getUserOwnedObjects(id, 'dashboard')
        .then(r => {
          setDashboardData(r);
          return Promise.resolve();
        })
        .catch((err: unknown) => {
          setDashboardData([]);
          addDangerToast(
            t('There was an issue fetching your dashboards: %s', err),
          );
          return Promise.resolve();
        }),
      getUserOwnedObjects(id, 'chart')
        .then(r => {
          setChartData(r);
          return Promise.resolve();
        })
        .catch((err: unknown) => {
          setChartData([]);
          addDangerToast(t('There was an issue fetching your chart: %s', err));
          return Promise.resolve();
        }),
      canReadSavedQueries
        ? getUserOwnedObjects(id, 'saved_query', ownSavedQueryFilters)
            .then(r => {
              setQueryData(r);
              return Promise.resolve();
            })
            .catch((err: unknown) => {
              setQueryData([]);
              addDangerToast(
                t('There was an issue fetching your saved queries: %s', err),
              );
              return Promise.resolve();
            })
        : Promise.resolve(),
    ]).then(() => {
      setIsFetchingActivityData(false);
    });
  }, [otherTabFilters]);

  const handleToggle = () => {
    setChecked(!checked);
    dangerouslySetItemDoNotUse(id, { thumbnails: !checked });
  };

  useEffect(() => {
    setActivityData(activityData => ({
      ...activityData,
      Created: [
        ...(chartData?.slice(0, 3) || []),
        ...(dashboardData?.slice(0, 3) || []),
        ...(queryData?.slice(0, 3) || []),
      ],
    }));
  }, [chartData, queryData, dashboardData]);

  const isRecentActivityLoading =
    !activityData?.[TableTab.Other] && !activityData?.[TableTab.Viewed];

  const menuData: SubMenuProps = {
    activeChild: 'Home',
    name: t('Home'),
  };

  if (isThumbnailsEnabled) {
    menuData.buttons = [
      {
        name: (
          <WelcomeNav>
            <div className="switch">
              <Switch checked={checked} onClick={handleToggle} />
              <span>{t('Thumbnails')}</span>
            </div>
          </WelcomeNav>
        ),
        onClick: handleToggle,
        buttonStyle: 'link',
      },
    ];
  }

  return (
    <>
      {SubmenuExtension ? (
        <SubmenuExtension {...menuData} />
      ) : (
        <SubMenu {...menuData} />
      )}
      <WelcomeContainer>
        {WelcomeMessageExtension && <WelcomeMessageExtension />}
        {WelcomeTopExtension && <WelcomeTopExtension />}
        {WelcomeMainExtension && <WelcomeMainExtension />}
        {(!WelcomeTopExtension || !WelcomeMainExtension) && (
          <HomeLayout>
            {/* Overview Stats Section */}
            <OverviewSection>
              <StatCard>
                <div className="stat-number">{dashboardData?.length || 0}</div>
                <div className="stat-label">{t('My Dashboards')}</div>
              </StatCard>
              <StatCard>
                <div className="stat-number">{chartData?.length || 0}</div>
                <div className="stat-label">{t('My Charts')}</div>
              </StatCard>
              {canReadSavedQueries && (
                <StatCard>
                  <div className="stat-number">{queryData?.length || 0}</div>
                  <div className="stat-label">{t('Saved Queries')}</div>
                </StatCard>
              )}
              <StatCard>
                <div className="stat-number">
                  {(activityData?.[TableTab.Viewed]?.length || 0) + 
                   (activityData?.[TableTab.Other]?.length || 0)}
                </div>
                <div className="stat-label">{t('Recent Activity')}</div>
              </StatCard>
            </OverviewSection>

            {/* Recent Activity Section */}
            <section>
              <SectionHeader>
                <h2>{t('Recent Activity')}</h2>
                <div className="section-controls">
                  <ViewToggle>
                    <button 
                      className={viewMode === 'grid' ? 'active' : ''} 
                      onClick={() => setViewMode('grid')}
                    >
                      {t('Grid')}
                    </button>
                    <button 
                      className={viewMode === 'list' ? 'active' : ''} 
                      onClick={() => setViewMode('list')}
                    >
                      {t('List')}
                    </button>
                  </ViewToggle>
                </div>
              </SectionHeader>
              {activityData &&
                (activityData[TableTab.Viewed] ||
                  activityData[TableTab.Other] ||
                  activityData[TableTab.Created]) &&
                activeChild !== 'Loading' ? (
                <ActivityTable
                  user={{ userId: user.userId! }}
                  activeChild={activeChild}
                  setActiveChild={setActiveChild}
                  activityData={activityData}
                  isFetchingActivityData={isFetchingActivityData}
                />
              ) : (
                <LoadingCards />
              )}
            </section>

            {/* Dashboards Section */}
            <section>
              <SectionHeader>
                <h2>{t('Dashboards')}</h2>
                <div className="section-controls">
                  <ViewToggle>
                    <button 
                      className={density === 'compact' ? 'active' : ''} 
                      onClick={() => setDensity('compact')}
                    >
                      {t('Compact')}
                    </button>
                    <button 
                      className={density === 'comfortable' ? 'active' : ''} 
                      onClick={() => setDensity('comfortable')}
                    >
                      {t('Comfortable')}
                    </button>
                    <button 
                      className={density === 'spacious' ? 'active' : ''} 
                      onClick={() => setDensity('spacious')}
                    >
                      {t('Spacious')}
                    </button>
                  </ViewToggle>
                </div>
              </SectionHeader>
              {!dashboardData || isRecentActivityLoading ? (
                <LoadingCards cover={checked} />
              ) : (
                <DashboardTable
                  user={user}
                  mine={dashboardData}
                  showThumbnails={checked}
                  otherTabData={activityData?.[TableTab.Other]}
                  otherTabFilters={otherTabFilters}
                  otherTabTitle={otherTabTitle}
                  viewMode={viewMode}
                  density={density}
                />
              )}
            </section>

            {/* Charts Section */}
            <section>
              <SectionHeader>
                <h2>{t('Charts')}</h2>
                <div className="section-controls">
                  <ViewToggle>
                    <button 
                      className={viewMode === 'grid' ? 'active' : ''} 
                      onClick={() => setViewMode('grid')}
                    >
                      {t('Grid')}
                    </button>
                    <button 
                      className={viewMode === 'list' ? 'active' : ''} 
                      onClick={() => setViewMode('list')}
                    >
                      {t('List')}
                    </button>
                  </ViewToggle>
                </div>
              </SectionHeader>
              {!chartData || isRecentActivityLoading ? (
                <LoadingCards cover={checked} />
              ) : (
                <ChartTable
                  showThumbnails={checked}
                  user={user}
                  mine={chartData}
                  otherTabData={activityData?.[TableTab.Other]}
                  otherTabFilters={otherTabFilters}
                  otherTabTitle={otherTabTitle}
                  viewMode={viewMode}
                  density={density}
                />
              )}
            </section>

            {/* Saved Queries Section */}
            {canReadSavedQueries && (
              <section>
                <SectionHeader>
                  <h2>{t('Saved Queries')}</h2>
                </SectionHeader>
                {!queryData ? (
                  <LoadingCards cover={checked} />
                ) : (
                  <SavedQueries
                    showThumbnails={checked}
                    user={user}
                    mine={queryData}
                    featureFlag={isThumbnailsEnabled}
                    viewMode={viewMode}
                    density={density}
                  />
                )}
              </section>
            )}
          </HomeLayout>
        )}
      </WelcomeContainer>
    </>
  );
}

export default withToasts(Welcome);
