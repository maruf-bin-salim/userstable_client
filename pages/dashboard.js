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
        const { data, error } = await supabase.from('users').select('*').eq('email', email);
        if (error || !data || data.length === 0) {
            return null;
        }

        setUserAccount(data[0]);
        return data[0];
    }



    async function keepLatestIdentity() {
        const { data } = await supabase.auth.getUserIdentities();
        const identities = data?.identities || null;


        if (!identities) return;

        identities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const oldIdentities = identities.length > 1 ? identities.slice(0, -1) : [];
        oldIdentities.forEach(async identity => await supabase.auth.unlinkIdentity(identity));
    }

    const fetchUsers = async (session, usersChanged) => {

        if (!session) return;
        if (!usersChanged) setIsLoading(true);
        let { data, error } = await supabase.from('users').select('*');
        if (error) console.error(error);
        // sort by last_sign_in_at, keep own account at the top
        data.sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime());

        let userIndex = data.findIndex(user => user.email === session.user.email);
        if (userIndex > 0 && data[userIndex].role === 'ADMIN') {
            let user = data.splice(userIndex, 1)[0];
            data.unshift(user);
        }

        let user = await fetchUserAccount(session.user.email);
        if (usersChanged && !user) {
            supabase.auth.signOut().then(() => router.push('/'));

        }


        setUsers(data);
        setIsLoading(false);
    };

    async function upsertUser(session) {


        let user = await fetchUserAccount(session.user.email);

        let addData = {
            id: session.user.id,
            email: session.user.email,
            last_sign_in_at: session.user.last_sign_in_at
        };
        if (!user || (user && user.user_generated_id === '')) {

            let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let randomIdFromCharsArray = Array.from({ length: 10 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
            addData.user_generated_id = randomIdFromCharsArray;
        }

        const { data, error } = await supabase.from('users').upsert([addData]);
        if (error) console.error(error);

    }





    useEffect(() => {
        const data = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_OUT') && !session) {
                router.push('/');
            } else {
                console.log('event', event);
                console.log('session at event', session);
                setSession(session);
                if (session) {

                }
            }
        });

        return () => data.data.subscription.unsubscribe();
    }, []);


    useEffect(() => {

        let subscription = null;

        async function handleSession(session) {
            if (session) {
                await keepLatestIdentity();
                await upsertUser(session);
                let user = await fetchUserAccount(session.user.email);
                if (!user) {
                    supabase.auth.signOut().then(() => router.push('/'));
                }
                else {
                    fetchUsers(session, false);
                }
            }
        }

        if (session) {

            handleSession(session);
            subscription = supabase
                .channel('user_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
                    fetchUsers(session, true);
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
                                                else {
                                                    const { error } = await supabase.rpc('deleteUserByEmail', { email_input: user.email });
                                                    if (error) console.error(error);
                                                }
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
                                    {user.user_generated_id}
                                </td>
                                <td className={styles.tableDataRole}>
                                    <button>
                                        {
                                            user?.role.toLowerCase() === 'admin' ?

                                                'admin' :
                                                'user '
                                        }

                                        {
                                            user.role === 'ADMIN' ? (
                                                <UserCheck2 size={24} />
                                            )
                                                : (
                                                    <UserIcon size={24} />
                                                )

                                        }
                                    </button>
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
