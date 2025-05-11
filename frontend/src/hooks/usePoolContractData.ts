import { useState, useEffect, useCallback } from 'react';
import { type PublicClient, formatEther } from 'viem';
import NftPoolAbi from '../abis/NftPoolAndTriggerBuy.json';
import {
    POOL_CONTRACT_ADDRESS,
    IS_DEVELOPMENT, 
    TARGET_NFT_PRICE_ETH_STRING
} from '../config';

export interface PoolData {
    totalRaisedWei: bigint;
    totalRaisedFormatted: string;
    targetPriceWei: bigint;
    targetPriceFormatted: string;
    currentState: number;
    isFunded: boolean;
    percentageFunded: number;
    isLoading: boolean;
    error: string | null;
}

export function usePoolContractData(publicClient: PublicClient | null) {
    const [poolData, setPoolData] = useState<PoolData>({
        totalRaisedWei: 0n,
        totalRaisedFormatted: "0",
        targetPriceWei: 0n,
        targetPriceFormatted: TARGET_NFT_PRICE_ETH_STRING, 
        currentState: 0,
        isFunded: false,
        percentageFunded: 0,
        isLoading: true,
        error: null,
    });

    const fetchPoolData = useCallback(async () => {
        if (!publicClient || !POOL_CONTRACT_ADDRESS) {
            setPoolData(prev => ({ ...prev, isLoading: false, error: "Pool contract address not configured or public client unavailable." }));
            return;
        }
        setPoolData(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            let totalRaised: bigint;
            let nftPriceFromContract: bigint;
            let state: number;

            if (IS_DEVELOPMENT) { 
                [totalRaised, nftPriceFromContract, state] = await Promise.all([
                    publicClient.readContract({
                        address: POOL_CONTRACT_ADDRESS,
                        abi: NftPoolAbi.abi,
                        functionName: 'totalRaisedWei',
                    }) as Promise<bigint>,
                    publicClient.readContract({
                        address: POOL_CONTRACT_ADDRESS,
                        abi: NftPoolAbi.abi,
                        functionName: 'nftPriceWei',
                    }) as Promise<bigint>,
                    publicClient.readContract({
                        address: POOL_CONTRACT_ADDRESS,
                        abi: NftPoolAbi.abi,
                        functionName: 'currentState',
                    }) as Promise<number>,
                ]);
            } else {
                // For Mainnet or other supported networks, use multicall
                const results = await publicClient.multicall({
                    contracts: [
                        { address: POOL_CONTRACT_ADDRESS, abi: NftPoolAbi.abi, functionName: 'totalRaisedWei' },
                        { address: POOL_CONTRACT_ADDRESS, abi: NftPoolAbi.abi, functionName: 'nftPriceWei' },
                        { address: POOL_CONTRACT_ADDRESS, abi: NftPoolAbi.abi, functionName: 'currentState' },
                    ],
                    allowFailure: false, // If one fails, the whole call fails
                });
                totalRaised = results[0] as bigint;
                nftPriceFromContract = results[1] as bigint;
                state = results[2] as number;
            }

            const raised = totalRaised;
            const target = nftPriceFromContract;
            const currentPercentage = target > 0n ? Number((raised * 10000n / target)) / 100 : 0;

            setPoolData({
                totalRaisedWei: raised,
                totalRaisedFormatted: formatEther(raised),
                targetPriceWei: target,
                targetPriceFormatted: formatEther(target),
                currentState: state,
                isFunded: raised >= target,
                percentageFunded: Math.min(100, currentPercentage),
                isLoading: false,
                error: null,
            });

        } catch (err: any) {
            console.error("Error fetching pool data:", err);
            console.log("poolData: ", poolData);
            setPoolData(prev => ({ ...prev, isLoading: false, error: err.message || "Failed to fetch pool data." }));
        }
    }, [publicClient]); // Removed ACTIVE_CHAIN from dependencies if it's stable based on IS_DEVELOPMENT

    useEffect(() => {
        if (publicClient && POOL_CONTRACT_ADDRESS) { 
            fetchPoolData();
            const intervalId = setInterval(fetchPoolData, 15000);
            return () => clearInterval(intervalId);
        }
    }, [publicClient, fetchPoolData]); // fetchPoolData is memoized, POOL_CONTRACT_ADDRESS is stable after init

    return { poolData, refreshPoolData: fetchPoolData };
}
