import { useEffect, useState } from 'react'
import { Block } from '../components/shared/Block'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { periods } from '../constants'
import { ExchangeService, MailBoxUsageDetail } from '../services/exchange'
import { formatBytestToGB } from '../utils/helpers'
import { ExchangeList } from '../components/ExchangeList'
import { ColDef } from 'ag-grid-community'

export const Exchange = () => {
    const [selectedPeriod, setSelectedPeriod] = useState<30 | 90>(30)

    const [isLoading, setIsLoading] = useState(true)

    const [activityDetails, setActivityDetails] = useState<MailBoxUsageDetail[]>([])

    const [statsDataFromApi, setStatsDataFromApi] = useState({
        totalMailboxesCount: '',
        activeMailboxesCount: '',
        inactiveMailboxesCount: '',
        activevsTotalMailboxes: '',
        totalStorage: '',
        sharedMailboxesCount: '',
        resourceMailboxesCount: '',
        totalContactsCount: '',
        emailReadsCount: '',
        emailReceivedCount: '',
        emailSentCount: '',
        activeUsers: '',
        outlookMobile: '',
        outlookWindows: '',
        outlookWeb: '',
        outlookother: '',
    })
    const boxStyle = { display: 'flex', flex: 1, justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }

    const setPageData = async () => {
        const promiseSettledResponse = await Promise.allSettled([
            ExchangeService.getTotalMailBoxUsageCounts(selectedPeriod),
            ExchangeService.getEmailUsageUserDetails(selectedPeriod),
            ExchangeService.getEmailActivityUserDetail(selectedPeriod),
            ExchangeService.getEmailAppUsageAppsUserCounts(selectedPeriod),
            ExchangeService.getTotalStorageUsed(selectedPeriod),
            ExchangeService.getMailboxUsageDetail(selectedPeriod),
            ExchangeService.getMailboxSettings(),
        ])
        setIsLoading(false)

        const emailUsageUserDetails =
            promiseSettledResponse[1].status === 'fulfilled' ? promiseSettledResponse[1].value : []

        const totalStorageUsed = promiseSettledResponse[4].status === 'fulfilled' ? promiseSettledResponse[4].value : []

        const emailActivityUserDetails =
            promiseSettledResponse[2].status === 'fulfilled' ? promiseSettledResponse[2].value : []

        const userUsageDetails = promiseSettledResponse[5].status === 'fulfilled' ? promiseSettledResponse[5].value : []

        setActivityDetails(userUsageDetails)

        const statsByDevice = promiseSettledResponse[3].status === 'fulfilled' ? promiseSettledResponse[3].value : []
        const groupByActivityCounts = emailUsageUserDetails.reduce(
            (acc, val) => {
                if (val.lastActivityDate) {
                    return {
                        ...acc,
                        activeMailboxesCount: acc.activeMailboxesCount + 1,
                    }
                }
                return {
                    ...acc,
                    inactiveMailboxesCount: acc.inactiveMailboxesCount + 1,
                }
            },
            {
                activeMailboxesCount: 0,
                inactiveMailboxesCount: 0,
            }
        )

        const totalMailboxesCount = emailUsageUserDetails.length
        const activevsTotalMailboxes = (
            (groupByActivityCounts.activeMailboxesCount / totalMailboxesCount) *
            100
        ).toFixed(2)

        const totalStorageUsedInBytes = totalStorageUsed.reduce((acc, val) => {
            return val.storageUsedInBytes + acc
        }, 0)

        const deviceData = statsByDevice.reduce(
            (acc, val) => {
                const {
                    outlookForMobile,
                    outlookForWeb,
                    outlookForWindows,
                    pop3App,
                    smtpApp,
                    mailForMac,
                    outlookForMac,
                } = val
                const others = (pop3App ?? 0) + (smtpApp ?? 0) + (mailForMac ?? 0) + (outlookForMac ?? 0)
                return {
                    ...acc,
                    outlookMobile: acc.outlookMobile + (outlookForMobile ?? 0),
                    outlookWeb: acc.outlookWeb + (outlookForWeb ?? 0),
                    outlookWindows: acc.outlookWindows + (outlookForWindows ?? 0),
                    outlookOther: others,
                }
            },
            {
                outlookMobile: 0,
                outlookWeb: 0,
                outlookWindows: 0,
                outlookOther: 0,
            }
        )

        setStatsDataFromApi(val => ({
            ...val,
            emailReadsCount: emailActivityUserDetails.reduce((acc, val) => acc + val.readCount, 0).toString(),
            emailReceivedCount: emailActivityUserDetails.reduce((acc, val) => acc + val.receiveCount, 0).toString(),
            emailSentCount: emailActivityUserDetails.reduce((acc, val) => acc + val.sendCount, 0).toString(),
            totalStorage: formatBytestToGB(totalStorageUsedInBytes, 1),
            inactiveMailboxesCount: groupByActivityCounts.inactiveMailboxesCount.toString(),
            activeMailboxesCount: groupByActivityCounts.activeMailboxesCount.toString(),
            totalMailboxesCount: totalMailboxesCount.toString(),
            activevsTotalMailboxes: activevsTotalMailboxes.toString() + '%',
            activeUsers: emailActivityUserDetails.filter(val => val.lastActivityDate, 0).length.toString(),
            outlookMobile: deviceData.outlookMobile.toString(),
            outlookother: deviceData.outlookOther.toString(),
            outlookWeb: deviceData.outlookWeb.toString(),
            outlookWindows: deviceData.outlookWindows.toString(),
        }))
    }
    useEffect(() => {
        setPageData()
    }, [selectedPeriod])

    const statsData = [
        { title: 'Total Mailboxes Count', value: statsDataFromApi.totalMailboxesCount },
        { title: 'Active Mailboxes Count', value: statsDataFromApi.activeMailboxesCount },
        { title: 'Inactive Mailboxes Count', value: statsDataFromApi.inactiveMailboxesCount },
        { title: 'Active vs Total Mailboxes', value: statsDataFromApi.activevsTotalMailboxes },
        { title: 'Total Storage (GB)', value: statsDataFromApi.totalStorage },
        { title: 'Shared Mailboxes Count', value: statsDataFromApi.sharedMailboxesCount },
        { title: 'Resource Mailboxes Count', value: statsDataFromApi.resourceMailboxesCount },
        { title: 'Total Contacts Count', value: statsDataFromApi.totalContactsCount },
        { title: 'Email Reads Count', value: statsDataFromApi.emailReadsCount },
        { title: 'Email Received Count', value: statsDataFromApi.emailReceivedCount },
        { title: 'Email Sent Count', value: statsDataFromApi.emailSentCount },
        { title: 'Active Users', value: statsDataFromApi.activeUsers },
        { title: 'Outlook Mobile', value: statsDataFromApi.outlookMobile },
        { title: 'Outlook Windows', value: statsDataFromApi.outlookWindows },
        { title: 'Outlook Web', value: statsDataFromApi.outlookWeb },
        { title: 'Outlook other', value: statsDataFromApi.outlookother },
    ]

    const columnDefGroups: ColDef[] = [
        { field: 'userPrincipalName', headerName: 'User Email Address', flex: 10 },
        { field: 'displayName', headerName: 'User Name', flex: 6 },
        {
            field: 'isDeleted',
            editable: false,
            headerName: 'Is Deleted',
            flex: 4,
        },
        {
            field: 'deletedDate',
            headerName: 'Deleted Date',
            flex: 4,
        },
        {
            headerName: 'Created Date',
            field: 'createdDate',
            flex: 4,
        },
        {
            field: 'lastActivityDate',
            headerName: 'Last Activity Date',
            flex: 4,
        },
        {
            headerName: 'Item Count',
            field: 'itemCount',
            flex: 4,
        },
        {
            field: 'storageUsedInBytes',
            headerName: 'Storage Used (GB)',
            valueFormatter: ({ value }) => formatBytestToGB(value, 3),
            flex: 4,
        },
        {
            field: 'hasArchive',
            editable: false,
            headerName: 'Has Archive',
            flex: 4,
        },
        // {
        //     field: 'renewedDateTime',
        //     headerName: 'Read',
        //     valueFormatter: params => {
        //         return params.value ? new Date(params.value).toLocaleString() : ''
        //     },
        //     flex: 4,
        // },
        // {
        //     field: 'renewedDateTime',
        //     headerName: 'Received',
        //     valueFormatter: params => {
        //         return params.value ? new Date(params.value).toLocaleString() : ''
        //     },
        //     flex: 4,
        // },
    ]

    return (
        <>
            <div style={{}}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {periods.map(period => (
                        <Chip
                            key={period.value}
                            label={period.label}
                            variant={selectedPeriod === period.value ? 'filled' : 'outlined'}
                            onClick={() => setSelectedPeriod(period.value)}
                        />
                    ))}
                </div>
                <Box
                    component="div"
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        gap: '8px',
                    }}
                >
                    {statsData.map(dt => (
                        <Block key={dt.title} title={dt.title}>
                            <Box component="span" sx={boxStyle}>
                                {dt.value}
                            </Box>
                        </Block>
                    ))}
                </Box>
                <Box component="div" sx={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)' }}>
                    <Block title="Mailbox logs">
                        <ExchangeList
                            columnDefs={columnDefGroups}
                            height="25rem"
                            width="100%"
                            exchanges={activityDetails}
                            isLoading={isLoading}
                        />
                    </Block>
                </Box>
            </div>
        </>
    )
}
