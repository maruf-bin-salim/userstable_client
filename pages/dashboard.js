import { supabase } from "@/supabase/client";
import { CircleDashedIcon, DeleteIcon, LogOut, User, UserCheck2, UserCircle2Icon, UserIcon, UserMinusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from '@/styles/dashboard.module.css'

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [userAccount, setUserAccount] = useState(null);


    async function fetchUserAccount(email) {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error || !data) {
            console.error(error);
            await supabase.auth.signOut();
            router.push('/');
            return;
        }

        setUserAccount(data);
    }

    useEffect(() => {

        if (session) {
            fetchUserAccount(session.user.email);
        }
    }
        , [session]);

    async function keepLatestIdentity() {
        const { data } = await supabase.auth.getUserIdentities();
        const identities = data?.identities || null;

        console.log('identities', identities);

        if (!identities) return;

        identities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const oldIdentities = identities.length > 1 ? identities.slice(0, -1) : [];
        oldIdentities.forEach(async identity => await supabase.auth.unlinkIdentity(identity));
    }

    const fetchUsers = async (session) => {

        if (!session) return;
        setIsLoading(true);
        let { data, error } = await supabase.from('users').select('*');
        if (error) console.error(error);
        // sort by last_sign_in_at, keep own account at the top
        data.sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime());

        let userIndex = data.findIndex(user => user.email === session.user.email);
        if (userIndex > 0 && data[userIndex].role === 'ADMIN') {
            let user = data.splice(userIndex, 1)[0];
            data.unshift(user);
        }

        setUsers(data);
        setIsLoading(false);
    };

    async function upsertUser(session) {
        const { data, error } = await supabase.from('users').upsert([{
            id: session.user.id,
            email: session.user.email,
            last_sign_in_at: session.user.last_sign_in_at
        }]);
        if (error) console.error(error);

    }

    useEffect(() => {
        if (session) fetchUsers(session);
    }, [session]);



    useEffect(() => {
        const data = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') && !session) {
                router.push('/');
            } else {
                setSession(session);
                if (session) {
                    keepLatestIdentity();
                    upsertUser(session);
                    fetchUserAccount(session.user.email);
                }
            }
        });

        return () => data.data.subscription.unsubscribe();
    }, []);


    // useEffect for realtime changes
    useEffect(() => {

        let subscription = null;

        if (session) {
            subscription = supabase
                .channel('user_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
                    console.log('Change received!', payload);
                    fetchUserAccount(session.user.email);
                    fetchUsers(session);

                })
                .subscribe()
        }


        return () => {
            if (subscription)
                supabase.removeChannel(subscription);
        };

    }
        , [session]);


    if (isLoading) {
        return (
            <div className={styles.loading_container}>
                <p className={styles.loadingText}>
                    <CircleDashedIcon size={48} />
                </p>
            </div>
        );
    }

    return (
        <div className={styles.main_container}>

            <div className={styles.navbar}>

                <div className={styles.navbar_left}>
                    {
                        session && session.user?.user_metadata?.avatar_url && (
                            <div>
                                <Link href="/profile">
                                    <img
                                        width={40}
                                        className={styles.avatar_image}
                                        src={session.user.user_metadata.avatar_url}
                                    />

                                </Link>
                            </div>
                        )
                    }
                    {
                        session && !session.user?.user_metadata?.avatar_url && (
                            <Link href="/profile">
                                <button className={`${styles.button} ${styles.fixed} ${styles.topLeft}`}>
                                    <UserCircle2Icon size={40} strokeWidth={1} />
                                </button>
                            </Link>
                        )
                    }
                    {
                        userAccount && userAccount.role === 'ADMIN' && (
                            <p>
                                <UserCheck2 size={28} />
                            </p>
                        )
                    }
                    {
                        userAccount && userAccount.role === 'USER' && (
                            <p>
                                <UserIcon size={28} />
                            </p>
                        )
                    }
                </div>

                {
                    session && (
                        <button onClick={() => supabase.auth.signOut()}>
                            <LogOut size={24} />
                        </button>
                    )
                }
            </div>

            {/* table */}

            {/* show user_id, email, last_sign_in_at, joined_at */}

            <table className={styles.table}>

                <thead className={styles.tableHead}>
                    <tr className={styles.textLeft}>
                        {
                            userAccount && userAccount.role === 'ADMIN' && (
                                <th className={styles.tableHeader}>Delete</th>
                            )
                        }
                        <th className={styles.tableHeader}>User ID</th>
                        <th className={styles.tableHeader}>Role</th>
                        <th className={styles.tableHeader}>Email</th>
                        <th className={styles.tableHeader}>Last Sign In</th>
                        <th className={styles.tableHeader}>Joined At</th>
                    </tr>
                </thead>

                <tbody className={styles.tableBody}>
                    {
                        users.map((user) => (
                            <tr key={user.id} className={styles.tableRow}>
                                {
                                    userAccount && userAccount.role === 'ADMIN' && userAccount.email !== user.email && (
                                        <td className={styles.tableData}>
                                            <button onClick={async () => {
                                                const { error } = await supabase.from('users').delete().eq('email', user.email);
                                                if (error) console.error(error);
                                            }} className={`${styles.deleteButton} ${styles.tableButton}`}>
                                                <UserMinusIcon size={18} />
                                            </button>
                                        </td>
                                    )
                                }


                                {
                                    userAccount && userAccount.role === 'ADMIN' && userAccount.email === user.email && (
                                        <td className={styles.tableData}>
                                            <button className={`${styles.disabledButton} ${styles.tableButton}`}>
                                                <UserMinusIcon size={18} />
                                            </button>
                                        </td>
                                    )
                                }
                                <td className={styles.tableData}>
                                    {user.user_id}
                                </td>
                                <td className={styles.tableDataRole}>
                                    {
                                        user.role === 'ADMIN' ? (
                                            <UserCheck2 size={24} />
                                        )
                                            : (
                                                <UserIcon size={24} />
                                            )

                                    }
                                </td>
                                <td className={`${styles.tableData}`}>
                                    {user.email}
                                </td>
                                <td className={styles.tableData}>
                                    {new Date(user.last_sign_in_at).toLocaleString()}
                                </td>
                                <td className={styles.tableData}>
                                    {new Date(user.joined_at).toLocaleString()}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>

            </table>
        </div>
    );
}
